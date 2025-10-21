const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Server } = require('socket.io');
const http = require('http');
const mime = require('mime-types');
const aiService = require('./ai-service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://localhost:5173", 
      "http://localhost:8080",
      "http://localhost:8081", 
      "http://localhost:8082",
      "http://localhost:8083",
      "http://localhost:8084",
      "http://localhost:8085",
      "http://localhost:8086",
      "http://192.168.1.101:8080",
      "http://192.168.1.101:8081",
      "http://192.168.1.101:8082",
      "http://192.168.1.101:8083",
      "http://192.168.1.101:8084",
      "http://192.168.1.101:8085",
      "http://192.168.1.101:8086"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'trumpet-super-secret-key-2024';
// In-memory SSE client registry: userId -> Set(res)
const sseClients = new Map();
// Socket.io user registry: userId -> socketId
const socketUsers = new Map();

// Initialize SQLite database
const db = new sqlite3.Database('./trumpet.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    password_hash TEXT,
    avatar TEXT,
    occupation TEXT,
    interests TEXT,
    location TEXT,
    bio TEXT,
    is_verified BOOLEAN DEFAULT 0,
    is_premium BOOLEAN DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Posts table
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    content TEXT,
    image_url TEXT,
    author_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users (id)
  )`);

  // Events table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    location TEXT,
    date DATETIME,
    image_url TEXT,
    max_attendees INTEGER,
    organizer_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users (id)
  )`);

  // Jobs table
  db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    company TEXT,
    location TEXT,
    type TEXT,
    salary TEXT,
    requirements TEXT,
    benefits TEXT,
    poster_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poster_id) REFERENCES users (id)
  )`);

  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    content TEXT,
    sender_id TEXT,
    receiver_id TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (id),
    FOREIGN KEY (receiver_id) REFERENCES users (id)
  )`);

  // Notifications table
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    type TEXT,
    message TEXT,
    data TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Gamification tables
  db.run(`CREATE TABLE IF NOT EXISTS user_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    total_posts INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0,
    total_comments_made INTEGER DEFAULT 0,
    total_connections INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    icon TEXT,
    points INTEGER,
    category TEXT,
    requirements TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    achievement_id INTEGER,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (achievement_id) REFERENCES achievements (id),
    UNIQUE(user_id, achievement_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    rarity TEXT, -- 'common', 'rare', 'epic', 'legendary'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    badge_id INTEGER,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (badge_id) REFERENCES badges (id),
    UNIQUE(user_id, badge_id)
  )`);

  // Insert default achievements
  db.run(`INSERT OR IGNORE INTO achievements (name, description, icon, points, category, requirements) VALUES 
    ('First Steps', 'Create your first post', '🎯', 10, 'content', '{"posts": 1}'),
    ('Social Butterfly', 'Make 10 connections', '🦋', 25, 'networking', '{"connections": 10}'),
    ('Content Creator', 'Create 10 posts', '✍️', 50, 'content', '{"posts": 10}'),
    ('Popular', 'Receive 100 likes', '❤️', 75, 'engagement', '{"likes_received": 100}'),
    ('Commentator', 'Make 50 comments', '💬', 30, 'engagement', '{"comments_made": 50}'),
    ('Networker', 'Make 50 connections', '🤝', 100, 'networking', '{"connections": 50}'),
    ('Influencer', 'Receive 500 likes', '⭐', 200, 'engagement', '{"likes_received": 500}'),
    ('Thought Leader', 'Create 50 posts', '🧠', 150, 'content', '{"posts": 50}'),
    ('Streak Master', 'Active for 7 consecutive days', '🔥', 50, 'consistency', '{"streak_days": 7}'),
    ('Legend', 'Reach level 25', '👑', 500, 'level', '{"level": 25}')
  `);

  // Insert default badges
  db.run(`INSERT OR IGNORE INTO badges (name, description, icon, color, rarity) VALUES 
    ('Newcomer', 'Welcome to the kingdom!', '👋', '#10B981', 'common'),
    ('Rising Star', 'Making your mark', '⭐', '#F59E0B', 'common'),
    ('Network Builder', 'Building connections', '🌐', '#3B82F6', 'rare'),
    ('Content King', 'Master of content creation', '👑', '#8B5CF6', 'rare'),
    ('Engagement Expert', 'Loved by the community', '💖', '#EF4444', 'epic'),
    ('Thought Leader', 'Shaping the conversation', '🧠', '#06B6D4', 'epic'),
    ('Kingdom Legend', 'A true TRUMPET legend', '🏆', '#F97316', 'legendary')
  `);

  // Advanced Networking tables
  db.run(`CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id TEXT,
    user2_id TEXT,
    connection_type TEXT DEFAULT 'friend', -- 'friend', 'colleague', 'mentor', 'mentee'
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME,
    FOREIGN KEY (user1_id) REFERENCES users (id),
    FOREIGN KEY (user2_id) REFERENCES users (id),
    UNIQUE(user1_id, user2_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS introductions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    introducer_id TEXT,
    user1_id TEXT,
    user2_id TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (introducer_id) REFERENCES users (id),
    FOREIGN KEY (user1_id) REFERENCES users (id),
    FOREIGN KEY (user2_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommender_id TEXT,
    user_id TEXT,
    skill TEXT,
    rating INTEGER, -- 1-5 stars
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recommender_id) REFERENCES users (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS mentorship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentor_id TEXT,
    mentee_id TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'completed', 'declined'
    start_date DATE,
    end_date DATE,
    goals TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES users (id),
    FOREIGN KEY (mentee_id) REFERENCES users (id)
  )`);

  // Likes table
  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(post_id, user_id)
  )`);

  // Friends table (bi-directional accepted friendships)
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
  )`);

  // Friend requests (pending)
  db.run(`CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, receiver_id)
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    content TEXT,
    post_id TEXT,
    author_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id),
    FOREIGN KEY (author_id) REFERENCES users (id)
  )`);

  // Event attendees table
  db.run(`CREATE TABLE IF NOT EXISTS event_attendees (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    user_id TEXT,
    status TEXT DEFAULT 'attending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(event_id, user_id)
  )`);

  // Job applications table
  db.run(`CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    user_id TEXT,
    cover_letter TEXT,
    resume_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(job_id, user_id)
  )`);

  // Prophecies (public library)
  db.run(`CREATE TABLE IF NOT EXISTS prophecies (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    mountain TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    video_url TEXT,
    audio_url TEXT,
    tags TEXT,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  )`);

  // Images table - Centralized image management
  db.run(`CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    description TEXT,
    uploaded_by TEXT,
    is_public BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
  )`);

  // Image relationships table - Links images to posts, events, etc.
  db.run(`CREATE TABLE IF NOT EXISTS image_relationships (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'post', 'event', 'user_avatar', 'job', etc.
    entity_id TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'primary', -- 'primary', 'thumbnail', 'gallery', etc.
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE
  )`);

  // Image tags table - For categorizing and searching images
  db.run(`CREATE TABLE IF NOT EXISTS image_tags (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE,
    UNIQUE(image_id, tag)
  )`);

  // Image analytics table - Track image views, downloads, etc.
  db.run(`CREATE TABLE IF NOT EXISTS image_analytics (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL, -- 'view', 'download', 'share', 'like'
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "*"],
      imgSrc: ["'self'", "data:", "blob:", "*", "http://*", "https://*"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*"],
      styleSrc: ["'self'", "'unsafe-inline'", "*"],
      connectSrc: ["'self'", "*", "http://*", "https://*", "ws://*", "wss://*"],
      fontSrc: ["'self'", "*", "https:", "data:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    },
  },
}));
// Enhanced CORS middleware
app.use((req, res, next) => {
  // Set CORS headers for all requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Foo, X-Bar, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Length", "X-Foo", "X-Bar", "Content-Type"],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Rate limiting - very permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Increased to 1000 requests per minute for development
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '25mb' }));
// Serve uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
console.log('📁 UPLOADS DIRECTORY:', uploadsDir);
console.log('📁 UPLOADS EXISTS:', fs.existsSync(uploadsDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

// Custom static file handler with proper CORS
app.use('/uploads', (req, res, next) => {
  console.log('🖼️ STATIC FILE REQUEST:', req.path);
  
  // Set explicit CORS headers for image requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Serve static files with custom handler
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Use mime-types package for proper MIME type detection
    const mimeType = mime.lookup(filePath);
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
      console.log('📄 SET MIME TYPE:', mimeType, 'for', filePath);
    }
    
    // Add cache headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    
    // CRITICAL: Set CORS headers in the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    console.log('🔧 CORS HEADERS SET FOR:', filePath);
  }
}));

// Additional CORS middleware specifically for static files
app.use('/uploads', (req, res, next) => {
  // Ensure CORS headers are set after static file serving
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Capture raw body for debugging (after JSON parsing)
app.use((req, res, next) => {
  req.rawBody = JSON.stringify(req.body);
  next();
});
app.use(express.urlencoded({ extended: true }));

// Better error handling for JSON parsing
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('JSON Parse Error:', error.message);
    console.error('Request body:', req.body);
    console.error('Raw body:', req.rawBody);
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }
  next();
});
// SSE stream for real-time events (messages)
app.get('/api/stream', (req, res) => {
  try {
    const token = req.query.token;
    if (!token || typeof token !== 'string') {
      return res.status(401).end();
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(403).end();
    }
    const userId = decoded.userId;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();
    // send initial ping
    res.write(`event: ping\n`);
    res.write(`data: connected\n\n`);

    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    const set = sseClients.get(userId);
    set.add(res);

    req.on('close', () => {
      set.delete(res);
      if (set.size === 0) sseClients.delete(userId);
    });
  } catch (e) {
    return res.status(500).end();
  }
});

function sseEmitToUser(userId, event, payload) {
  const set = sseClients.get(userId);
  if (!set) return;
  const data = JSON.stringify({ type: event, payload });
  for (const res of set) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    } catch (_) {
      // ignore write errors
    }
  }
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, firstName, lastName, occupation, interests, location, password } = req.body;

    // Check if user exists
    db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (row) {
        return res.status(400).json({ success: false, message: 'Email or username already exists' });
      }

      // Hash password
      const passwordHash = bcrypt.hashSync(password, 12);
      const userId = uuidv4();

      // Insert user
      db.run(
        'INSERT INTO users (id, email, username, first_name, last_name, password_hash, occupation, interests, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, email, username, firstName, lastName, passwordHash, occupation, JSON.stringify(interests), location],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Failed to create user' });
          }

          // Generate token
          const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

          res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user: { id: userId, email, username, firstName, lastName, occupation, interests, location }, token }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    console.log('Login request body:', req.body);
    console.log('Login request rawBody:', req.rawBody);
    const { email, password } = req.body;
    
    console.log('Extracted email:', email);
    console.log('Extracted password:', password);
    
    if (!email || !password) {
      console.log('Missing email or password - email:', email, 'password:', password);
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            occupation: user.occupation,
            interests: JSON.parse(user.interests || '[]'),
            location: user.location,
            avatar: user.avatar,
            bio: user.bio,
            isVerified: user.is_verified,
            isPremium: user.is_premium,
            level: user.level,
            experience: user.experience
          },
          token
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          occupation: user.occupation,
          interests: JSON.parse(user.interests || '[]'),
          location: user.location,
          avatar: user.avatar,
          bio: user.bio,
          isVerified: user.is_verified,
          isPremium: user.is_premium,
          level: user.level,
          experience: user.experience
        }
      }
    });
  });
});

// Profile update endpoint
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { firstName, lastName, bio, occupation, interests, location } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    
    if (firstName !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(lastName);
    }
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      updateValues.push(bio);
    }
    if (occupation !== undefined) {
      updateFields.push('occupation = ?');
      updateValues.push(occupation);
    }
    if (interests !== undefined) {
      updateFields.push('interests = ?');
      updateValues.push(JSON.stringify(interests));
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    updateValues.push(req.user.userId);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.run(query, updateValues, function(err) {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ success: false, message: 'Failed to update profile' });
      }
      
      // Return updated user data
      db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], (err, user) => {
        if (err || !user) {
          return res.status(500).json({ success: false, message: 'Failed to fetch updated profile' });
        }
        
        res.json({
          success: true,
          message: 'Profile updated successfully',
          data: {
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              firstName: user.first_name,
              lastName: user.last_name,
              occupation: user.occupation,
              interests: JSON.parse(user.interests || '[]'),
              location: user.location,
              avatar: user.avatar,
              bio: user.bio,
              isVerified: user.is_verified,
              isPremium: user.is_premium,
              level: user.level,
              experience: user.experience
            }
          }
        });
      });
    });
  } catch (error) {
    console.error('Error in profile update:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Profile picture upload endpoint
app.post('/api/auth/avatar', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    // Update user's avatar in database
    db.run(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatarUrl, req.user.userId],
      function(err) {
        if (err) {
          console.error('Error updating avatar:', err);
          return res.status(500).json({ success: false, message: 'Failed to update avatar' });
        }
        
        res.json({
          success: true,
          message: 'Avatar updated successfully',
          data: {
            avatar_url: avatarUrl
          }
        });
      }
    );
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});

// Profile picture removal endpoint
app.delete('/api/auth/avatar', authenticateToken, (req, res) => {
  try {
    // Get current avatar URL
    db.get('SELECT avatar FROM users WHERE id = ?', [req.user.userId], (err, user) => {
      if (err) {
        console.error('Error fetching user avatar:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch current avatar' });
      }
      
      // Remove avatar from database
      db.run(
        'UPDATE users SET avatar = NULL WHERE id = ?',
        [req.user.userId],
        function(err) {
          if (err) {
            console.error('Error removing avatar:', err);
            return res.status(500).json({ success: false, message: 'Failed to remove avatar' });
          }
          
          // Optionally delete the file from filesystem
          if (user && user.avatar) {
            const avatarPath = path.join(uploadsDir, user.avatar.replace('/uploads/', ''));
            if (fs.existsSync(avatarPath)) {
              try {
                fs.unlinkSync(avatarPath);
                console.log('Deleted avatar file:', avatarPath);
              } catch (deleteErr) {
                console.error('Error deleting avatar file:', deleteErr);
              }
            }
          }
          
          res.json({
            success: true,
            message: 'Avatar removed successfully'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error removing avatar:', error);
    res.status(500).json({ success: false, message: 'Failed to remove avatar' });
  }
});

// Posts routes
app.post('/api/posts', authenticateToken, (req, res) => {
  try {
    const { content, imageUrl, imageBase64 } = req.body;
    const postId = uuidv4();
    let finalImageUrl = imageUrl || null;
    // If a base64 image is provided, save it to uploads and build a URL
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/')) {
      try {
        const matches = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mime = matches[1];
          const data = matches[2];
          const ext = mime.split('/')[1] || 'png';
          const filename = `${postId}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
          finalImageUrl = `/uploads/${filename}`;
        }
      } catch (_) {}
    }

    db.run(
      'INSERT INTO posts (id, content, image_url, author_id) VALUES (?, ?, ?, ?)',
      [postId, content, finalImageUrl, req.user.userId],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Failed to create post' });
        }

        // Return enriched post row including author fields like feed endpoint
        db.get(`
          SELECT p.*, u.first_name, u.last_name, u.username, u.occupation as user_occupation, u.location as user_location
          FROM posts p
          JOIN users u ON p.author_id = u.id
          WHERE p.id = ?
        `, [postId], (qErr, row) => {
          if (qErr || !row) {
            return res.status(201).json({ success: true, message: 'Post created successfully', data: { post: { id: postId, content, image_url: finalImageUrl, author_id: req.user.userId } } });
          }
          return res.status(201).json({ success: true, message: 'Post created successfully', data: { post: row } });
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/upload/image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    console.log('📤 IMAGE UPLOAD REQUEST:', {
      hasFile: !!req.file,
      filename: req.file?.filename,
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size
    });
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    
    console.log('✅ IMAGE UPLOAD SUCCESS:', {
      filename: req.file.filename,
      imageUrl,
      fullPath: path.join(__dirname, 'uploads', req.file.filename)
    });
    
    return res.status(201).json({ success: true, message: 'Image uploaded', data: { url: imageUrl } });
  } catch (e) {
    console.error('❌ IMAGE UPLOAD ERROR:', e);
    return res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

// Dedicated image serving endpoint with explicit CORS
app.get('/api/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(uploadsDir, filename);
  
  console.log('🖼️ DEDICATED IMAGE ENDPOINT:', filename);
  
  // Set explicit CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.log('❌ IMAGE NOT FOUND:', imagePath);
    return res.status(404).json({ success: false, message: 'Image not found' });
  }
  
  // Set proper MIME type
  const mimeType = mime.lookup(imagePath);
  if (mimeType) {
    res.setHeader('Content-Type', mimeType);
    console.log('📄 SET MIME TYPE:', mimeType, 'for', imagePath);
  }
  
  // Set cache headers
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  
  console.log('✅ SERVING IMAGE:', imagePath);
  
  // Send the file
  res.sendFile(imagePath);
});

// Alternative approach: Base64 encoded image endpoint to avoid CORS issues
app.get('/api/image-base64/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(uploadsDir, filename);
  
  console.log('🖼️ BASE64 IMAGE ENDPOINT:', filename);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.log('❌ IMAGE NOT FOUND:', imagePath);
    return res.status(404).json({ success: false, message: 'Image not found' });
  }
  
  try {
    // Read the file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const mimeType = mime.lookup(imagePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    console.log('✅ SERVING BASE64 IMAGE:', imagePath);
    
    res.json({ 
      success: true, 
      dataUrl: dataUrl,
      mimeType: mimeType,
      size: imageBuffer.length
    });
  } catch (error) {
    console.error('❌ ERROR READING IMAGE:', error);
    res.status(500).json({ success: false, message: 'Error reading image' });
  }
});

// Home feed: self + friends + same mountain
app.get('/api/feed', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  // Get user's occupation
  db.get('SELECT occupation FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(500).json({ success: false, message: 'Database error' });
    const occupation = user.occupation;
    // Get friend ids (bi-directional)
    db.all(`
      SELECT friend_id AS fid FROM friends WHERE user_id = ?
      UNION
      SELECT user_id AS fid FROM friends WHERE friend_id = ?
    `, [userId, userId], (fErr, rows) => {
      if (fErr) return res.status(500).json({ success: false, message: 'Database error' });
      const friendIds = rows.map(r => r.fid);
      // Build feed
      const placeholders = friendIds.length ? friendIds.map(() => '?').join(',') : '';
      let query = `
        SELECT p.*, u.first_name, u.last_name, u.username, u.occupation
        FROM posts p
        JOIN users u ON p.author_id = u.id
        WHERE p.author_id = ? OR u.occupation = ?`;
      const params = [userId, occupation];
      if (friendIds.length) {
        query += ` OR p.author_id IN (${placeholders})`;
        params.push(...friendIds);
      }
      query += ' ORDER BY p.created_at DESC LIMIT 100';
      db.all(query, params, (pErr, posts) => {
        if (pErr) return res.status(500).json({ success: false, message: 'Database error' });
        
        // Simple approach - just return posts with their image_url
        res.json({ success: true, data: { posts: posts } });
      });
    });
  });
});

app.get('/api/posts', authenticateToken, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.userId;

  // First, get the current user's occupation (mountain)
  db.get('SELECT occupation FROM users WHERE id = ?', [userId], (userErr, currentUser) => {
    if (userErr || !currentUser) {
      console.error('Error fetching user:', userErr);
      return res.status(500).json({ success: false, message: 'Failed to fetch user data' });
    }

    const userOccupation = currentUser.occupation;

    // Only fetch posts from users in the same mountain (same occupation)
    let query = `
      SELECT 
        p.*, 
        u.first_name, 
        u.last_name, 
        u.username, 
        u.avatar as avatar_url, 
        u.occupation as user_occupation, 
        u.location as user_location,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as shares_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE u.occupation = ?
      ORDER BY p.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    let params = [userId, userOccupation, parseInt(limit), offset];

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching posts:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      // Transform the data to match frontend expectations
      const posts = rows.map(row => ({
        ...row,
        author: {
          firstName: row.first_name,
          lastName: row.last_name,
          username: row.username,
          avatar_url: row.avatar_url,
          occupation: row.user_occupation,
          location: row.user_location
        },
        is_liked: row.is_liked > 0
      }));

      res.json({ success: true, data: posts });
    });
  });
});

// Like/unlike a post (toggle)
app.post('/api/posts/:id/like', authenticateToken, (req, res) => {
  const postId = req.params.id;
  const userId = req.user.userId;
  db.get('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (row) {
      db.run('DELETE FROM likes WHERE id = ?', [row.id], function (delErr) {
        if (delErr) return res.status(500).json({ success: false, message: 'Failed to unlike' });
        return res.json({ success: true, message: 'Unliked', data: { liked: false } });
      });
    } else {
      const likeId = uuidv4();
      db.run('INSERT INTO likes (id, post_id, user_id) VALUES (?, ?, ?)', [likeId, postId, userId], function (insErr) {
        if (insErr) return res.status(500).json({ success: false, message: 'Failed to like' });
        
        // Get post author to send notification
        db.get('SELECT author_id, content FROM posts WHERE id = ?', [postId], (authorErr, post) => {
          if (!authorErr && post && post.author_id !== userId) {
            // Get liker's name
            db.get('SELECT first_name, last_name, username FROM users WHERE id = ?', [userId], (userErr, liker) => {
              if (!userErr && liker) {
                const likerName = liker.first_name && liker.last_name 
                  ? `${liker.first_name} ${liker.last_name}` 
                  : liker.username;
                
                createNotification(
                  post.author_id,
                  'like',
                  `${likerName} liked your post`,
                  { post_id: postId, liker_id: userId, liker_name: likerName }
                );
              }
            });
          }
        });
        
        return res.json({ success: true, message: 'Liked', data: { liked: true } });
      });
    }
  });
});

// Add a comment to a post
app.post('/api/posts/:id/comments', authenticateToken, (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }
  const id = uuidv4();
  db.run(
    'INSERT INTO comments (id, content, post_id, author_id) VALUES (?, ?, ?, ?)',
    [id, content.trim(), postId, req.user.userId],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: 'Failed to add comment' });
      
      // Get post author to send notification
      db.get('SELECT author_id, content FROM posts WHERE id = ?', [postId], (authorErr, post) => {
        if (!authorErr && post && post.author_id !== req.user.userId) {
          // Get commenter's name
          db.get('SELECT first_name, last_name, username FROM users WHERE id = ?', [req.user.userId], (userErr, commenter) => {
            if (!userErr && commenter) {
              const commenterName = commenter.first_name && commenter.last_name 
                ? `${commenter.first_name} ${commenter.last_name}` 
                : commenter.username;
              
              createNotification(
                post.author_id,
                'comment',
                `${commenterName} commented on your post`,
                { post_id: postId, comment_id: id, commenter_id: req.user.userId, commenter_name: commenterName }
              );
            }
          });
        }
      });
      
      return res.status(201).json({ success: true, message: 'Comment added', data: { comment: { id, content: content.trim(), post_id: postId, author_id: req.user.userId } } });
    }
  );
});

// Get comments for a post
app.get('/api/posts/:id/comments', authenticateToken, (req, res) => {
  const postId = req.params.id;
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 20);
  const offset = (page - 1) * limit;
  
  db.all(
    `SELECT c.*, u.first_name, u.last_name, u.username, u.avatar as avatar_url
     FROM comments c 
     LEFT JOIN users u ON c.author_id = u.id 
     WHERE c.post_id = ? 
     ORDER BY c.created_at ASC 
     LIMIT ? OFFSET ?`,
    [postId, limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      
      // Transform the data to match frontend expectations
      const comments = rows.map(comment => ({
        ...comment,
        author: {
          firstName: comment.first_name,
          lastName: comment.last_name,
          username: comment.username,
          avatar_url: comment.avatar_url
        }
      }));
      
      return res.json({ success: true, data: { comments } });
    }
  );
});

// Events routes
app.post('/api/events', authenticateToken, (req, res) => {
  try {
    const { title, description, location, date, maxAttendees, imageUrl } = req.body;
    const eventId = uuidv4();

    db.run(
      'INSERT INTO events (id, title, description, location, date, max_attendees, image_url, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [eventId, title, description, location, date, maxAttendees, imageUrl, req.user.userId],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Failed to create event' });
        }

        res.status(201).json({
          success: true,
          message: 'Event created successfully',
          data: { event: { id: eventId, title, description, location, date, maxAttendees, imageUrl, organizerId: req.user.userId } }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/events', (req, res) => {
  const { page = 1, limit = 20, location, occupation } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT e.*, u.first_name, u.last_name, u.username, u.avatar, u.occupation as user_occupation
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE e.date >= datetime('now')
  `;
  let params = [];

  if (location) {
    query += ' AND e.location LIKE ?';
    params.push(`%${location}%`);
  }
  if (occupation) {
    query += ' AND u.occupation = ?';
    params.push(occupation);
  }

  query += ' ORDER BY e.date ASC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(query, params, (err, events) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    res.json({
      success: true,
      data: { events }
    });
  });
});

// Jobs routes
app.post('/api/jobs', authenticateToken, (req, res) => {
  try {
    const { title, description, company, location, type, salary, requirements, benefits } = req.body;
    const jobId = uuidv4();

    db.run(
      'INSERT INTO jobs (id, title, description, company, location, type, salary, requirements, benefits, poster_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [jobId, title, description, company, location, type, salary, JSON.stringify(requirements || []), JSON.stringify(benefits || []), req.user.userId],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Failed to create job' });
        }

        res.status(201).json({
          success: true,
          message: 'Job posted successfully',
          data: { job: { id: jobId, title, description, company, location, type, salary, requirements, benefits, posterId: req.user.userId } }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/jobs', (req, res) => {
  const { page = 1, limit = 20, location, type, occupation } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT j.*, u.first_name, u.last_name, u.username, u.avatar, u.occupation as user_occupation
    FROM jobs j
    JOIN users u ON j.poster_id = u.id
    WHERE j.is_active = 1
  `;
  let params = [];

  if (location) {
    query += ' AND j.location LIKE ?';
    params.push(`%${location}%`);
  }
  if (type) {
    query += ' AND j.type = ?';
    params.push(type);
  }
  if (occupation) {
    query += ' AND u.occupation = ?';
    params.push(occupation);
  }

  query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(query, params, (err, jobs) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    res.json({
      success: true,
      data: { jobs }
    });
  });
});

// Messages (chat) routes
// Send message
app.post('/api/messages', authenticateToken, (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'receiverId and content are required' });
    }
    const id = uuidv4();
    db.run(
      'INSERT INTO messages (id, content, sender_id, receiver_id, is_read) VALUES (?, ?, ?, ?, 0)',
      [id, content, req.user.userId, receiverId],
      function (err) {
        if (err) return res.status(500).json({ success: false, message: 'Failed to send message' });
        const message = { id, content, senderId: req.user.userId, receiverId, isRead: false, created_at: new Date().toISOString() };
        // Push real-time event to receiver
        sseEmitToUser(receiverId, 'message', message);
        return res.status(201).json({ success: true, message: 'Message sent', data: { message } });
      }
    );
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get conversations (last message per partner)
app.get('/api/messages/conversations', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.all(
    `SELECT m.*, 
     CASE 
       WHEN m.sender_id = ? THEN u2.first_name || ' ' || u2.last_name
       ELSE u1.first_name || ' ' || u1.last_name
     END as partner_name,
     CASE 
       WHEN m.sender_id = ? THEN u2.id
       ELSE u1.id
     END as partner_id
     FROM messages m
     LEFT JOIN users u1 ON m.sender_id = u1.id
     LEFT JOIN users u2 ON m.receiver_id = u2.id
     WHERE m.sender_id = ? OR m.receiver_id = ? 
     ORDER BY m.created_at DESC`,
    [userId, userId, userId, userId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      const map = new Map();
      rows.forEach((m) => {
        const partnerId = m.partner_id;
        if (!map.has(partnerId)) {
          map.set(partnerId, { 
            lastMessage: m, 
            unreadCount: 0,
            partnerName: m.partner_name,
            partnerId: partnerId
          });
        }
        if (m.receiver_id === userId && !m.is_read) {
          map.get(partnerId).unreadCount += 1;
        }
      });
      const items = Array.from(map.entries()).map(([partnerId, info]) => ({ partnerId, ...info }));
      return res.json({ success: true, data: { conversations: items } });
    }
  );
});

// Get messages with a specific user
app.get('/api/messages/:userId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const partnerId = req.params.userId;
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 50);
  const offset = (page - 1) * limit;
  db.all(
    `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, partnerId, partnerId, userId, limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      // mark incoming unread as read
      db.run(
        `UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
        [partnerId, userId],
        () => {
          return res.json({ success: true, data: { messages: rows.reverse() } });
        }
      );
    }
  );
});

// Users routes
app.get('/api/users', (req, res) => {
  const { page = 1, limit = 20, occupation, location, interests } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM users';
  let params = [];
  let conditions = [];

  if (occupation) {
    conditions.push('occupation = ?');
    params.push(occupation);
  }
  if (location) {
    conditions.push('location LIKE ?');
    params.push(`%${location}%`);
  }
  if (interests) {
    const interestList = interests.split(',');
    const interestConditions = interestList.map(() => 'interests LIKE ?');
    conditions.push(`(${interestConditions.join(' OR ')})`);
    interestList.forEach(interest => params.push(`%${interest}%`));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(query, params, (err, users) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      occupation: user.occupation,
      interests: JSON.parse(user.interests || '[]'),
      location: user.location,
      avatar: user.avatar,
      bio: user.bio,
      isVerified: user.is_verified,
      isPremium: user.is_premium,
      level: user.level,
      experience: user.experience
    }));

    res.json({
      success: true,
      data: { users: formattedUsers }
    });
  });
});

// Send friend request
app.post('/api/friends/request', authenticateToken, (req, res) => {
  const { userId: targetId } = req.body;
  const requesterId = req.user.userId;
  if (!targetId || targetId === requesterId) {
    return res.status(400).json({ success: false, message: 'Invalid target user' });
  }
  const id = uuidv4();
  db.run(
    `INSERT OR IGNORE INTO friend_requests (id, requester_id, receiver_id, status) VALUES (?, ?, ?, 'pending')`,
    [id, requesterId, targetId],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      return res.status(201).json({ success: true, message: 'Friend request sent' });
    }
  );
});

// Accept friend request
app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { requesterId } = req.body;
  const receiverId = req.user.userId;
  if (!requesterId) return res.status(400).json({ success: false, message: 'requesterId required' });
  // verify pending request exists
  db.get(`SELECT * FROM friend_requests WHERE requester_id = ? AND receiver_id = ? AND status = 'pending'`, [requesterId, receiverId], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
    // create friendship both directions
    const id1 = uuidv4();
    const id2 = uuidv4();
    db.serialize(() => {
      db.run(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`, [row.id]);
      db.run(`INSERT OR IGNORE INTO friends (id, user_id, friend_id) VALUES (?, ?, ?)`, [id1, requesterId, receiverId]);
      db.run(`INSERT OR IGNORE INTO friends (id, user_id, friend_id) VALUES (?, ?, ?)`, [id2, receiverId, requesterId], (e2) => {
        if (e2) return res.status(500).json({ success: false, message: 'Database error' });
        return res.json({ success: true, message: 'Friend request accepted' });
      });
    });
  });
});

// List incoming friend requests
app.get('/api/friends/requests', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.all(`SELECT fr.*, u.first_name, u.last_name, u.username FROM friend_requests fr JOIN users u ON fr.requester_id = u.id WHERE fr.receiver_id = ? AND fr.status = 'pending' ORDER BY fr.created_at DESC`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    return res.json({ success: true, data: { requests: rows } });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Trumpet API is running',
    timestamp: new Date().toISOString()
  });
});

// Prophecy Library routes
// Create prophecy (text/link/audio). mountain maps to user's occupation; library is public by default
app.post('/api/prophecies', authenticateToken, (req, res) => {
  try {
    const { title, body, videoUrl, audioUrl, tags, mountain } = req.body;
    const id = uuidv4();
    const normalizedMountain = (mountain || '').trim() || 'other';
    const tagsJson = JSON.stringify((tags || []).map((t) => String(t).trim()).filter(Boolean));

    db.run(
      'INSERT INTO prophecies (id, author_id, mountain, title, body, video_url, audio_url, tags, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [id, req.user.userId, normalizedMountain, title, body || null, videoUrl || null, audioUrl || null, tagsJson],
      function (err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Failed to create prophecy' });
        }
        return res.status(201).json({
          success: true,
          data: {
            prophecy: { id, authorId: req.user.userId, mountain: normalizedMountain, title, body, videoUrl, audioUrl, tags: JSON.parse(tagsJson), isPublic: true }
          }
        });
      }
    );
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List/search prophecies (public). Filters: q (keyword), mountain, tag
app.get('/api/prophecies', (req, res) => {
  const { page = 1, limit = 20, q, mountain, tag } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM prophecies WHERE is_public = 1';
  const params = [];

  if (mountain) {
    query += ' AND mountain = ?';
    params.push(mountain);
  }
  if (q) {
    query += ' AND (title LIKE ? OR body LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (tag) {
    // simple LIKE match within JSON tags array
    query += ' AND tags LIKE ?';
    params.push(`%${tag}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    const prophecies = rows.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      mountain: r.mountain,
      title: r.title,
      body: r.body,
      videoUrl: r.video_url,
      audioUrl: r.audio_url,
      tags: JSON.parse(r.tags || '[]'),
      isPublic: !!r.is_public,
      createdAt: r.created_at
    }));
    return res.json({ success: true, data: { prophecies } });
  });
});

// Get prophecy by id
app.get('/api/prophecies/:id', (req, res) => {
  db.get('SELECT * FROM prophecies WHERE id = ?', [req.params.id], (err, r) => {
    if (err || !r) {
      return res.status(404).json({ success: false, message: 'Prophecy not found' });
    }
    return res.json({
      success: true,
      data: {
        prophecy: {
          id: r.id,
          authorId: r.author_id,
          mountain: r.mountain,
          title: r.title,
          body: r.body,
          videoUrl: r.video_url,
          audioUrl: r.audio_url,
          tags: JSON.parse(r.tags || '[]'),
          isPublic: !!r.is_public,
          createdAt: r.created_at
        }
      }
    });
  });
});

// 404 handler
// Notification endpoints
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 20);
  const offset = (page - 1) * limit;
  
  db.all(
    `SELECT * FROM notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [userId, limit, offset],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      const notifications = rows.map(row => ({
        ...row,
        data: JSON.parse(row.data || '{}')
      }));
      
      res.json({ success: true, data: { notifications } });
    }
  );
});

app.get('/api/notifications/unread-count', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.get(
    `SELECT COUNT(*) as count 
     FROM notifications 
     WHERE user_id = ? AND is_read = 0`,
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, data: { count: row.count } });
    }
  );
});

app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const notificationId = req.params.id;
  
  db.run(
    `UPDATE notifications 
     SET is_read = 1 
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }
      
      res.json({ success: true, message: 'Notification marked as read' });
    }
  );
});

app.put('/api/notifications/read-all', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.run(
    `UPDATE notifications 
     SET is_read = 1 
     WHERE user_id = ? AND is_read = 0`,
    [userId],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, message: 'All notifications marked as read' });
    }
  );
});

// Gamification endpoints
app.get('/api/gamification/level/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  
  db.get(
    `SELECT * FROM user_levels WHERE user_id = ?`,
    [userId],
    (err, levelData) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (!levelData) {
        // Initialize user level data
        db.run(
          `INSERT INTO user_levels (user_id, level, experience_points) VALUES (?, 1, 0)`,
          [userId],
          function(err) {
            if (err) {
              return res.status(500).json({ success: false, message: 'Failed to initialize user level' });
            }
            
            res.json({ 
              success: true, 
              data: { 
                level: 1, 
                experience_points: 0, 
                total_posts: 0,
                total_likes_received: 0,
                total_comments_made: 0,
                total_connections: 0,
                streak_days: 0
              } 
            });
          }
        );
      } else {
        res.json({ success: true, data: levelData });
      }
    }
  );
});

app.get('/api/gamification/achievements/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    `SELECT a.*, ua.earned_at 
     FROM achievements a 
     LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
     ORDER BY a.points ASC`,
    [userId],
    (err, achievements) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, data: { achievements } });
    }
  );
});

app.get('/api/gamification/badges/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    `SELECT b.*, ub.earned_at 
     FROM badges b 
     LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = ?
     ORDER BY b.rarity DESC, b.name ASC`,
    [userId],
    (err, badges) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, data: { badges } });
    }
  );
});

app.get('/api/gamification/leaderboard', authenticateToken, (req, res) => {
  const { type = 'level', limit = 10 } = req.query;
  
  let orderBy = 'level DESC, experience_points DESC';
  if (type === 'posts') orderBy = 'total_posts DESC';
  if (type === 'likes') orderBy = 'total_likes_received DESC';
  if (type === 'connections') orderBy = 'total_connections DESC';
  
  db.all(
    `SELECT ul.*, u.first_name, u.last_name, u.occupation, u.location
     FROM user_levels ul
     JOIN users u ON ul.user_id = u.id
     ORDER BY ${orderBy}
     LIMIT ?`,
    [limit],
    (err, leaderboard) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, data: { leaderboard } });
    }
  );
});

// Advanced Networking endpoints
app.post('/api/networking/introduction', authenticateToken, (req, res) => {
  const { user1_id, user2_id, message } = req.body;
  const introducer_id = req.user.userId;
  
  if (!user1_id || !user2_id || !message) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  db.run(
    `INSERT INTO introductions (introducer_id, user1_id, user2_id, message) 
     VALUES (?, ?, ?, ?)`,
    [introducer_id, user1_id, user2_id, message],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, message: 'Introduction sent successfully' });
    }
  );
});

app.post('/api/networking/recommendation', authenticateToken, (req, res) => {
  const { user_id, skill, rating, comment } = req.body;
  const recommender_id = req.user.userId;
  
  if (!user_id || !skill || !rating) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  db.run(
    `INSERT INTO recommendations (recommender_id, user_id, skill, rating, comment) 
     VALUES (?, ?, ?, ?, ?)`,
    [recommender_id, user_id, skill, rating, comment],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, message: 'Recommendation added successfully' });
    }
  );
});

app.post('/api/networking/mentorship/request', authenticateToken, (req, res) => {
  const { mentee_id, goals } = req.body;
  const mentor_id = req.user.userId;
  
  if (!mentee_id) {
    return res.status(400).json({ success: false, message: 'Missing mentee_id' });
  }
  
  db.run(
    `INSERT INTO mentorship (mentor_id, mentee_id, goals) 
     VALUES (?, ?, ?)`,
    [mentor_id, mentee_id, JSON.stringify(goals)],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, message: 'Mentorship request sent successfully' });
    }
  );
});

app.get('/api/networking/connections/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    `SELECT c.*, u.first_name, u.last_name, u.occupation, u.location
     FROM connections c
     JOIN users u ON (c.user1_id = u.id OR c.user2_id = u.id)
     WHERE (c.user1_id = ? OR c.user2_id = ?) AND c.status = 'accepted'
     AND u.id != ?`,
    [userId, userId, userId],
    (err, connections) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, data: { connections } });
    }
  );
});

app.get('/api/networking/recommendations/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    `SELECT r.*, u.first_name, u.last_name, u.occupation
     FROM recommendations r
     JOIN users u ON r.recommender_id = u.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`,
    [userId],
    (err, recommendations) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({ success: true, data: { recommendations } });
    }
  );
});

// AI Recommendation endpoints
app.get('/api/ai/content-recommendations/:userId', authenticateToken, async (req, res) => {
  const userId = req.params.userId;
  
  try {
    // Get user profile
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's recent posts
    const posts = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 5',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const recommendations = await aiService.getContentRecommendations(user, posts);
    
    res.json({ success: true, data: { recommendations } });
  } catch (error) {
    console.error('AI content recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations' });
  }
});

app.get('/api/ai/connection-recommendations/:userId', authenticateToken, async (req, res) => {
  const userId = req.params.userId;
  
  try {
    // Get user profile
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's existing connections
    const connections = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM connections WHERE (user1_id = ? OR user2_id = ?) AND status = "accepted"',
        [userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get all users
    const allUsers = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users WHERE id != ?', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const recommendations = await aiService.getConnectionRecommendations(user, connections, allUsers);
    
    res.json({ success: true, data: { recommendations } });
  } catch (error) {
    console.error('AI connection recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations' });
  }
});

app.post('/api/ai/analyze-post/:postId', authenticateToken, async (req, res) => {
  const postId = req.params.postId;
  
  try {
    const post = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM posts WHERE id = ?', [postId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const analysis = await aiService.analyzePostEngagement(post);
    
    res.json({ success: true, data: { analysis } });
  } catch (error) {
    console.error('AI post analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze post' });
  }
});

// Catch-all route moved to end of file

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  socketUsers.set(socket.userId, socket.id);
  
  // Join user to their personal room
  socket.join(`user_${socket.userId}`);
  
  // Video calling events
  socket.on('join-call', (callId) => {
    socket.join(callId);
    socket.to(callId).emit('user-joined', socket.userId);
  });

  socket.on('leave-call', (callId) => {
    socket.leave(callId);
    socket.to(callId).emit('user-left', socket.userId);
  });

  socket.on('signal', (data) => {
    socket.broadcast.emit('signal', data);
  });

  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.broadcast.emit('ice-candidate', candidate);
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    socketUsers.delete(socket.userId);
  });
});

// Helper function to send notification to user
const sendNotificationToUser = (userId, notification) => {
  const socketId = socketUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification', notification);
  }
};

// Helper function to create and send notification
const createNotification = async (userId, type, message, data = {}) => {
  try {
    // Create notification in database
    const notificationData = {
      user_id: userId,
      type,
      message,
      data,
      is_read: false
    };
    
    db.run(
      `INSERT INTO notifications (user_id, type, message, data, is_read, created_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [userId, type, message, JSON.stringify(data), false],
      function(err) {
        if (err) {
          console.error('Error creating notification:', err);
          return;
        }
        
        const notification = {
          id: this.lastID,
          ...notificationData,
          created_at: new Date().toISOString()
        };
        
        // Send real-time notification
        sendNotificationToUser(userId, notification);
      }
    );
  } catch (error) {
    console.error('Error in createNotification:', error);
  }
};

// ==================== IMAGE MANAGEMENT API ENDPOINTS ====================

// Upload image endpoint
app.post('/api/images/upload', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const imageId = uuidv4();
    const { originalname, filename, path, size, mimetype } = req.file;
    
    // Get image dimensions (basic implementation)
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(path);
    const width = 0; // Would need image processing library like sharp
    const height = 0;

    // Save image metadata to database
    db.run(
      `INSERT INTO images (id, filename, original_name, file_path, file_size, mime_type, width, height, uploaded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [imageId, filename, originalname, path, size, mimetype, width, height, req.user.userId],
      function(err) {
        if (err) {
          console.error('Error saving image metadata:', err);
          return res.status(500).json({ success: false, message: 'Failed to save image metadata' });
        }

        res.json({
          success: true,
          message: 'Image uploaded successfully',
          data: {
            imageId,
            filename,
            originalName: originalname,
            filePath: path,
            fileSize: size,
            mimeType: mimetype,
            url: `/uploads/${filename}`
          }
        });
      }
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});

// Get image by ID
app.get('/api/images/:id', (req, res) => {
  const imageId = req.params.id;
  
  db.get(
    `SELECT i.*, u.first_name, u.last_name, u.username 
     FROM images i 
     LEFT JOIN users u ON i.uploaded_by = u.id 
     WHERE i.id = ?`,
    [imageId],
    (err, image) => {
      if (err) {
        console.error('Error fetching image:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (!image) {
        return res.status(404).json({ success: false, message: 'Image not found' });
      }

      // Track image view
      const analyticsId = uuidv4();
      db.run(
        `INSERT INTO image_analytics (id, image_id, user_id, action, ip_address, user_agent, referrer) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [analyticsId, imageId, req.user?.userId || null, 'view', req.ip, req.get('User-Agent'), req.get('Referer')]
      );

      res.json({
        success: true,
        data: {
          id: image.id,
          filename: image.filename,
          originalName: image.original_name,
          filePath: image.file_path,
          fileSize: image.file_size,
          mimeType: image.mime_type,
          width: image.width,
          height: image.height,
          altText: image.alt_text,
          description: image.description,
          isPublic: image.is_public,
          uploadedBy: {
            id: image.uploaded_by,
            name: `${image.first_name} ${image.last_name}`,
            username: image.username
          },
          createdAt: image.created_at,
          url: `/uploads/${image.filename}`
        }
      });
    }
  );
});

// Get images with filtering and pagination
app.get('/api/images', (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    uploadedBy, 
    mimeType, 
    tag, 
    isPublic = true,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;
  
  const offset = (page - 1) * limit;
  let query = `
    SELECT i.*, u.first_name, u.last_name, u.username,
           COUNT(ia.id) as view_count
    FROM images i 
    LEFT JOIN users u ON i.uploaded_by = u.id 
    LEFT JOIN image_analytics ia ON i.id = ia.image_id AND ia.action = 'view'
    WHERE 1=1
  `;
  
  const params = [];
  
  if (uploadedBy) {
    query += ` AND i.uploaded_by = ?`;
    params.push(uploadedBy);
  }
  
  if (mimeType) {
    query += ` AND i.mime_type LIKE ?`;
    params.push(`%${mimeType}%`);
  }
  
  if (isPublic !== undefined) {
    query += ` AND i.is_public = ?`;
    params.push(isPublic === 'true' ? 1 : 0);
  }
  
  if (tag) {
    query += ` AND i.id IN (SELECT image_id FROM image_tags WHERE tag LIKE ?)`;
    params.push(`%${tag}%`);
  }
  
  query += ` GROUP BY i.id ORDER BY i.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, images) => {
    if (err) {
      console.error('Error fetching images:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM images i WHERE 1=1`;
    const countParams = [];
    
    if (uploadedBy) {
      countQuery += ` AND i.uploaded_by = ?`;
      countParams.push(uploadedBy);
    }
    
    if (mimeType) {
      countQuery += ` AND i.mime_type LIKE ?`;
      countParams.push(`%${mimeType}%`);
    }
    
    if (isPublic !== undefined) {
      countQuery += ` AND i.is_public = ?`;
      countParams.push(isPublic === 'true' ? 1 : 0);
    }
    
    if (tag) {
      countQuery += ` AND i.id IN (SELECT image_id FROM image_tags WHERE tag LIKE ?)`;
      countParams.push(`%${tag}%`);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        console.error('Error counting images:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({
        success: true,
        data: {
          images: images.map(img => ({
            id: img.id,
            filename: img.filename,
            originalName: img.original_name,
            fileSize: img.file_size,
            mimeType: img.mime_type,
            width: img.width,
            height: img.height,
            altText: img.alt_text,
            description: img.description,
            isPublic: img.is_public,
            viewCount: img.view_count,
            uploadedBy: {
              id: img.uploaded_by,
              name: `${img.first_name} ${img.last_name}`,
              username: img.username
            },
            createdAt: img.created_at,
            url: `/uploads/${img.filename}`
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            pages: Math.ceil(countResult.total / limit)
          }
        }
      });
    });
  });
});

// Create image relationship (link image to post, event, etc.)
app.post('/api/images/:imageId/relationships', authenticateToken, (req, res) => {
  const { imageId } = req.params;
  const { entityType, entityId, relationshipType = 'primary', displayOrder = 0 } = req.body;
  
  if (!entityType || !entityId) {
    return res.status(400).json({ success: false, message: 'entityType and entityId are required' });
  }
  
  const relationshipId = uuidv4();
  
  db.run(
    `INSERT INTO image_relationships (id, image_id, entity_type, entity_id, relationship_type, display_order) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [relationshipId, imageId, entityType, entityId, relationshipType, displayOrder],
    function(err) {
      if (err) {
        console.error('Error creating image relationship:', err);
        return res.status(500).json({ success: false, message: 'Failed to create image relationship' });
      }
      
      res.json({
        success: true,
        message: 'Image relationship created successfully',
        data: { relationshipId, imageId, entityType, entityId, relationshipType, displayOrder }
      });
    }
  );
});

// Get images for a specific entity (post, event, etc.)
app.get('/api/images/entity/:entityType/:entityId', (req, res) => {
  const { entityType, entityId } = req.params;
  
  db.all(
    `SELECT i.*, ir.relationship_type, ir.display_order, u.first_name, u.last_name, u.username
     FROM images i
     JOIN image_relationships ir ON i.id = ir.image_id
     LEFT JOIN users u ON i.uploaded_by = u.id
     WHERE ir.entity_type = ? AND ir.entity_id = ?
     ORDER BY ir.display_order ASC, i.created_at DESC`,
    [entityType, entityId],
    (err, images) => {
      if (err) {
        console.error('Error fetching entity images:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({
        success: true,
        data: {
          entityType,
          entityId,
          images: images.map(img => ({
            id: img.id,
            filename: img.filename,
            originalName: img.original_name,
            fileSize: img.file_size,
            mimeType: img.mime_type,
            width: img.width,
            height: img.height,
            altText: img.alt_text,
            description: img.description,
            relationshipType: img.relationship_type,
            displayOrder: img.display_order,
            uploadedBy: {
              id: img.uploaded_by,
              name: `${img.first_name} ${img.last_name}`,
              username: img.username
            },
            createdAt: img.created_at,
            url: `/uploads/${img.filename}`
          }))
        }
      });
    }
  );
});

// Add tags to image
app.post('/api/images/:imageId/tags', authenticateToken, (req, res) => {
  const { imageId } = req.params;
  const { tags } = req.body;
  
  if (!tags || !Array.isArray(tags)) {
    return res.status(400).json({ success: false, message: 'Tags array is required' });
  }
  
  const tagInserts = tags.map(tag => {
    const tagId = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO image_tags (id, image_id, tag) VALUES (?, ?, ?)`,
        [tagId, imageId, tag],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });
  
  Promise.all(tagInserts)
    .then(() => {
      res.json({
        success: true,
        message: 'Tags added successfully',
        data: { imageId, tags }
      });
    })
    .catch(err => {
      console.error('Error adding tags:', err);
      res.status(500).json({ success: false, message: 'Failed to add tags' });
    });
});

// Get image analytics
app.get('/api/images/:imageId/analytics', authenticateToken, (req, res) => {
  const { imageId } = req.params;
  const { action, days = 30 } = req.query;
  
  let query = `
    SELECT action, COUNT(*) as count, DATE(created_at) as date
    FROM image_analytics 
    WHERE image_id = ? AND created_at >= datetime('now', '-${days} days')
  `;
  
  const params = [imageId];
  
  if (action) {
    query += ` AND action = ?`;
    params.push(action);
  }
  
  query += ` GROUP BY action, DATE(created_at) ORDER BY date DESC`;
  
  db.all(query, params, (err, analytics) => {
    if (err) {
      console.error('Error fetching image analytics:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({
      success: true,
      data: {
        imageId,
        period: `${days} days`,
        analytics: analytics.map(stat => ({
          action: stat.action,
          count: stat.count,
          date: stat.date
        }))
      }
    });
  });
});

// Delete image
app.delete('/api/images/:imageId', authenticateToken, (req, res) => {
  const { imageId } = req.params;
  
  // First check if user owns the image
  db.get('SELECT * FROM images WHERE id = ? AND uploaded_by = ?', [imageId, req.user.userId], (err, image) => {
    if (err) {
      console.error('Error checking image ownership:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found or access denied' });
    }
    
    // Delete image file from filesystem
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, image.file_path);
    
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting image file:', err);
      }
    });
    
    // Delete from database (cascades to relationships, tags, analytics)
    db.run('DELETE FROM images WHERE id = ?', [imageId], function(err) {
      if (err) {
        console.error('Error deleting image:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete image' });
      }
      
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    });
  });
});

// ==================== END IMAGE MANAGEMENT API ====================

// ==================== USER FEED API ====================

// Get user's own posts
app.get('/api/users/:userId/posts', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  db.all(`
    SELECT p.*, u.first_name, u.last_name, u.username, u.occupation, u.location, u.avatar as avatar_url,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
           (SELECT COUNT(*) FROM post_shares WHERE post_id = p.id) as shares_count,
           EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.author_id = ?
    ORDER BY p.created_at DESC
  `, [req.user.userId, userId], (err, posts) => {
    if (err) {
      console.error('Error fetching user posts:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({
      success: true,
      data: { posts }
    });
  });
});

// Get mountain feed (posts from users in same occupation)
app.get('/api/users/:userId/mountain-feed', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  // First get user's occupation
  db.get('SELECT occupation FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get posts from users in same occupation
    db.all(`
      SELECT p.*, u.first_name, u.last_name, u.username, u.occupation, u.location, u.avatar as avatar_url,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
             (SELECT COUNT(*) FROM post_shares WHERE post_id = p.id) as shares_count,
             EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE u.occupation = ? AND p.author_id != ?
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [req.user.userId, user.occupation, userId], (err, posts) => {
      if (err) {
        console.error('Error fetching mountain feed:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({
        success: true,
        data: { posts }
      });
    });
  });
});

// Get mountain users (users in same occupation)
app.get('/api/users/:userId/mountain-users', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  // First get user's occupation
  db.get('SELECT occupation FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get users in same occupation
    db.all(`
      SELECT id, first_name, last_name, username, occupation, location, avatar_url,
             last_seen, is_online
      FROM users
      WHERE occupation = ? AND id != ?
      ORDER BY is_online DESC, last_seen DESC
      LIMIT 20
    `, [user.occupation, userId], (err, users) => {
      if (err) {
        console.error('Error fetching mountain users:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({
        success: true,
        data: { users }
      });
    });
  });
});

// Get user analytics
app.get('/api/users/:userId/analytics', authenticateToken, (req, res) => {
  const { userId } = req.params;
  
  // Mock analytics data for now
  const analytics = {
    profileViews: Math.floor(Math.random() * 1000) + 500,
    postEngagement: Math.floor(Math.random() * 30) + 70,
    connections: Math.floor(Math.random() * 100) + 50,
    contentReach: Math.floor(Math.random() * 2000) + 1000,
    weeklyStats: {
      posts: Math.floor(Math.random() * 10) + 5,
      likes: Math.floor(Math.random() * 50) + 20,
      comments: Math.floor(Math.random() * 20) + 10,
      shares: Math.floor(Math.random() * 15) + 5
    },
    topPosts: [
      { title: "Building Better Teams", engagement: 95, reach: 1200 },
      { title: "Remote Work Tips", engagement: 87, reach: 980 },
      { title: "Leadership Insights", engagement: 82, reach: 750 }
    ],
    growthMetrics: {
      followers: Math.floor(Math.random() * 20) + 10,
      engagement: Math.floor(Math.random() * 15) + 5,
      reach: Math.floor(Math.random() * 10) + 5
    }
  };
  
  res.json({
    success: true,
    data: analytics
  });
});

// Like a post
app.post('/api/posts/:postId/like', authenticateToken, (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;
  
  // Check if already liked
  db.get('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId], (err, existing) => {
    if (err) {
      console.error('Error checking like:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (existing) {
      // Unlike
      db.run('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId], (err) => {
        if (err) {
          console.error('Error unliking post:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, data: { liked: false } });
      });
    } else {
      // Like
      db.run('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId], (err) => {
        if (err) {
          console.error('Error liking post:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, data: { liked: true } });
      });
    }
  });
});

// Comment on a post
app.post('/api/posts/:postId/comments', authenticateToken, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.userId;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content is required' });
  }
  
  db.run('INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)', 
    [postId, userId, content.trim()], function(err) {
    if (err) {
      console.error('Error adding comment:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    // Get the created comment with author info
    db.get(`
      SELECT c.*, u.first_name, u.last_name, u.username, u.avatar as avatar_url
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [this.lastID], (err, comment) => {
      if (err) {
        console.error('Error fetching comment:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      res.json({
        success: true,
        data: { comment }
      });
    });
  });
});

// Share a post
app.post('/api/posts/:postId/share', authenticateToken, (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;
  
  db.run('INSERT INTO post_shares (post_id, user_id) VALUES (?, ?)', [postId, userId], (err) => {
    if (err) {
      console.error('Error sharing post:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    res.json({ success: true, data: { shared: true } });
  });
});

// ==================== END USER FEED API ====================

// Catch-all route for 404 errors (must be last)
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}/api`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.io server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.close();
  process.exit(0);
});
