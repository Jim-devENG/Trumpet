const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const mime = require('mime-types');
const aiService = require('./ai-service');

// Import Supabase and Cloudinary
const supabase = require('./config/supabase');
const cloudinary = require('./config/cloudinary');

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
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Foo, X-Bar, Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Length", "X-Foo, X-Bar, Content-Type"],
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// SSE stream for real-time events
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
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or username already exists' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 12);
    const userId = uuidv4();

    // Insert user
    console.log('Creating user with data:', {
      id: userId,
      email,
      username,
      first_name: firstName,
      last_name: lastName,
      occupation,
      interests: JSON.stringify(interests),
      location
    });

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        password_hash: passwordHash,
        occupation,
        interests: JSON.stringify(interests),
        location
      })
      .select()
      .single();

    if (insertError) {
      console.error('User creation error:', insertError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create user',
        error: insertError.message,
        details: insertError
      });
    }

    console.log('User created successfully:', newUser);

    // Generate token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { 
        user: { 
          id: userId, 
          email, 
          username, 
          firstName, 
          lastName, 
          occupation, 
          interests, 
          location 
        }, 
        token 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user || !bcrypt.compareSync(password, user.password_hash)) {
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Image upload with Cloudinary
app.post('/api/upload/image', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'trumpet/images',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});

// Posts routes
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { content, imageUrl, imageBase64 } = req.body;
    const postId = uuidv4();
    let finalImageUrl = imageUrl || null;

    // If a base64 image is provided, upload to Cloudinary
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/')) {
      try {
        const result = await cloudinary.uploader.upload(imageBase64, {
          folder: 'trumpet/posts',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        });
        finalImageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image
      }
    }

    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        id: postId,
        content,
        image_url: finalImageUrl,
        author_id: req.user.userId
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: 'Failed to create post' });
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: { post: newPost }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching posts from database...');
    
    // Try a simple query first
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Database error:', error);
      // Return empty array instead of error to prevent app crash
      return res.json({ success: true, data: [] });
    }

    console.log('Posts fetched successfully:', posts?.length || 0, 'posts');
    res.json({ success: true, data: posts || [] });
  } catch (error) {
    console.error('Server error:', error);
    // Return empty array instead of error to prevent app crash
    res.json({ success: true, data: [] });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Trumpet API is running',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Test if we can connect to Supabase
    const { data, error } = await supabase
      .from('posts')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message,
        details: error
      });
    }
    
    console.log('Database connection successful');
    res.json({
      success: true,
      message: 'Database connection successful',
      data: data
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
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
  
  socket.join(`user_${socket.userId}`);
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    socketUsers.delete(socket.userId);
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
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
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
