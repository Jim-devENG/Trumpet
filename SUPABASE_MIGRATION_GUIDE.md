# 🚀 Trumpet Backend Migration to Supabase

## Overview
This guide will help you migrate your Trumpet backend from SQLite to Supabase, taking advantage of Supabase's integrated database, authentication, and storage services.

## Prerequisites
- Supabase account (free tier)
- Node.js backend (already set up)
- Basic understanding of PostgreSQL

## Step 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login
3. Click "New Project"
4. Choose organization
5. Enter project details:
   - **Name**: trumpet-backend
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users

### 1.2 Get Project Credentials
After project creation, go to Settings > API:
- **Project URL**: `https://your-project.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 2: Database Schema Migration

### 2.1 Convert SQLite Schema to PostgreSQL

Your current SQLite tables need these changes:

```sql
-- Users table (PostgreSQL version)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255),
    avatar TEXT,
    occupation VARCHAR(100),
    interests JSONB,
    location VARCHAR(100),
    bio TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT,
    image_url TEXT,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### 2.2 Enable Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Example RLS policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view public posts" ON posts
    FOR SELECT USING (true);
```

## Step 3: Backend Code Migration

### 3.1 Install Supabase Dependencies
```bash
cd backend
npm install @supabase/supabase-js
npm uninstall sqlite3  # Remove SQLite dependency
```

### 3.2 Environment Variables
Create `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
PORT=8000
```

### 3.3 Update server.js
Replace SQLite with Supabase client:

```javascript
// Replace SQLite imports
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Replace database operations
// OLD: db.get('SELECT * FROM users WHERE id = ?', [userId], callback)
// NEW: 
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

### 3.4 Authentication Migration
Replace JWT with Supabase Auth:

```javascript
// OLD: Custom JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  // ... JWT verification
};

// NEW: Supabase Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
  
  req.user = user;
  next();
};
```

### 3.5 File Storage Migration
Replace local file storage with Supabase Storage:

```javascript
// OLD: Local file upload with multer
app.post('/api/upload/image', authenticateToken, upload.single('image'), (req, res) => {
  // ... multer handling
});

// NEW: Supabase Storage
app.post('/api/upload/image', authenticateToken, async (req, res) => {
  try {
    const { file } = req.body; // Base64 or FormData
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(`${req.user.id}/${Date.now()}.jpg`, file, {
        contentType: 'image/jpeg'
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);
    
    res.json({ success: true, data: { url: publicUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});
```

## Step 4: Real-time Features Migration

### 4.1 Replace Socket.io with Supabase Realtime
```javascript
// OLD: Socket.io setup
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: "*" } });

// NEW: Supabase Realtime
// Frontend will use Supabase client for real-time subscriptions
// Backend sends updates via Supabase Realtime

// Example: Send real-time notification
const sendNotification = async (userId, notification) => {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: notification.type,
      message: notification.message,
      data: notification.data
    });
  
  if (!error) {
    // Trigger real-time update
    await supabase
      .channel('notifications')
      .send({
        type: 'broadcast',
        event: 'notification',
        payload: { userId, notification }
      });
  }
};
```

## Step 5: Deployment Options

### Option A: Railway (Recommended)
1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push
4. **Cost**: Free tier with $5 monthly credit

### Option B: Render
1. Connect GitHub repository to Render
2. Choose "Web Service"
3. Set build command: `npm install`
4. Set start command: `npm start`
5. **Cost**: Free tier (sleeps after 15 min inactivity)

### Option C: Vercel (Serverless)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in backend directory
3. Configure as serverless functions
4. **Cost**: Free tier with usage limits

## Step 6: Database Migration Script

Create `migrate-to-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const db = new sqlite3.Database('./trumpet.db');

async function migrateUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users', async (err, rows) => {
      if (err) return reject(err);
      
      for (const user of rows) {
        const { error } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            password_hash: user.password_hash,
            avatar: user.avatar,
            occupation: user.occupation,
            interests: JSON.parse(user.interests || '[]'),
            location: user.location,
            bio: user.bio,
            is_verified: user.is_verified,
            is_premium: user.is_premium,
            level: user.level,
            experience: user.experience,
            created_at: user.created_at,
            updated_at: user.updated_at
          });
        
        if (error) console.error('Error migrating user:', user.id, error);
      }
      
      resolve();
    });
  });
}

async function migratePosts() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM posts', async (err, rows) => {
      if (err) return reject(err);
      
      for (const post of rows) {
        const { error } = await supabase
          .from('posts')
          .insert({
            id: post.id,
            content: post.content,
            image_url: post.image_url,
            author_id: post.author_id,
            created_at: post.created_at,
            updated_at: post.updated_at
          });
        
        if (error) console.error('Error migrating post:', post.id, error);
      }
      
      resolve();
    });
  });
}

async function migrate() {
  try {
    console.log('Starting migration...');
    await migrateUsers();
    console.log('Users migrated');
    await migratePosts();
    console.log('Posts migrated');
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    db.close();
  }
}

migrate();
```

## Step 7: Testing the Migration

### 7.1 Test Database Connection
```javascript
// Test Supabase connection
const testConnection = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .limit(1);
  
  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('✅ Supabase connected successfully');
  }
};
```

### 7.2 Test Authentication
```javascript
// Test user registration
const testAuth = async () => {
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123'
  });
  
  console.log('Auth test:', { data, error });
};
```

## Step 8: Performance Optimization

### 8.1 Database Indexes
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX CONCURRENTLY idx_notifications_user_created ON notifications(user_id, created_at DESC);
```

### 8.2 Connection Pooling
```javascript
// Configure connection pooling
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});
```

## Troubleshooting

### Common Issues:
1. **RLS Policies**: Make sure Row Level Security policies are properly configured
2. **CORS**: Configure CORS settings in Supabase dashboard
3. **File Uploads**: Check storage bucket permissions
4. **Real-time**: Ensure real-time is enabled for your tables

### Monitoring:
- Use Supabase dashboard to monitor database usage
- Set up alerts for approaching limits
- Monitor API usage and bandwidth

## Cost Comparison

| Service | Database | Storage | Bandwidth | Monthly Cost |
|---------|----------|---------|-----------|--------------|
| **Supabase Free** | 500MB | 1GB | 2GB | $0 |
| **Railway + PlanetScale** | 5GB | 1GB | 100GB | $0 (with credit) |
| **Render + Neon** | 3GB | 1GB | 100GB | $0 (sleeps) |

## Recommendation

For your Trumpet app, I recommend:

1. **Start with Supabase** for simplicity and integrated features
2. **Monitor usage** and migrate to Railway + PlanetScale if you need more database space
3. **Use Supabase Auth** instead of custom JWT for better security
4. **Leverage Supabase Storage** for file uploads instead of local storage

This migration will give you a more scalable, secure, and feature-rich backend while staying within free tier limits.
