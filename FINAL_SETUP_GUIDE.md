# 🚀 Complete Setup Guide: Render + Supabase + Cloudinary (2025)

## Overview
This guide will help you set up your Trumpet social media app with:
- **Render**: Backend hosting (100% FREE)
- **Supabase**: Database + Auth + Storage (500MB + 1GB)
- **Cloudinary**: Image storage (25GB)
- **Total Cost**: $0/month (forever free!)

## 📋 Prerequisites
- GitHub account
- Your Trumpet project (already set up)
- Basic understanding of environment variables

---

## Step 1: Set Up Render (Backend Hosting)

### 1.1 Create Render Account
1. Go to **[render.com](https://render.com)**
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended)
4. Authorize Render to access your repositories

### 1.2 Deploy Your Backend
1. In Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect your **GitHub repository**
4. Choose your **Trumpet repository**
5. Configure the service:
   - **Name**: `trumpet-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (no credit system!)

### 1.3 Configure Render Settings
1. In your service dashboard, go to **"Environment"** tab
2. Add these environment variables (we'll fill them in later):

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here
```

**Render will provide:**
- **Deployment URL**: `https://trumpet-backend.onrender.com`
- **Auto-deploy**: Updates automatically on git push

---

## Step 2: Set Up Supabase (Database + Auth + Storage)

### 2.1 Create Supabase Account
1. Go to **[supabase.com](https://supabase.com)**
2. Click **"Start your project"**
3. Sign up with **GitHub** (recommended)
4. Verify your email

### 2.2 Create New Project
1. In Supabase dashboard, click **"New Project"**
2. Choose your organization
3. Enter project details:
   - **Name**: `trumpet-app`
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**

### 2.3 Get Supabase Credentials
1. Go to **Settings** → **API**
2. Copy these credentials:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2.4 Set Up Database Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL to create your tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT,
    image_url TEXT,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    max_attendees INTEGER,
    organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    description TEXT,
    company VARCHAR(255),
    location VARCHAR(255),
    type VARCHAR(100),
    salary VARCHAR(100),
    requirements JSONB,
    benefits JSONB,
    poster_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Friends table
CREATE TABLE friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Friend requests table
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendees table
CREATE TABLE event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'attending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Job applications table
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    resume_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view public posts" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = author_id);
```

### 2.5 Set Up Storage Bucket
1. Go to **Storage** in Supabase dashboard
2. Click **"Create bucket"**
3. Name: `images`
4. Make it **Public**
5. Click **"Create bucket"**

---

## Step 3: Set Up Cloudinary (Image Storage)

### 3.1 Create Cloudinary Account
1. Go to **[cloudinary.com](https://cloudinary.com)**
2. Click **"Sign Up For Free"**
3. Fill in your details:
   - **Email**: your-email@example.com
   - **Password**: strong password
   - **Full Name**: Your name
   - **Company**: Trumpet
4. Click **"Create Account"**

### 3.2 Get Cloudinary Credentials
1. After signup, you'll see your dashboard
2. Note down these credentials:
   - **Cloud Name**: `your-cloud-name`
   - **API Key**: `123456789012345`
   - **API Secret**: `your-secret-key`

### 3.3 Configure Cloudinary Settings
1. In Cloudinary dashboard, go to **"Settings"**
2. Go to **"Upload"** tab
3. Set these preferences:
   - **Upload preset**: `unsigned` (for direct uploads)
   - **Signing mode**: `Unsigned`
   - **Folder**: `trumpet/` (for organization)

---

## Step 4: Update Your Backend Code

### 4.1 Install Required Dependencies
```bash
cd backend
npm install @supabase/supabase-js cloudinary
npm uninstall sqlite3  # Remove SQLite
```

### 4.2 Create Supabase Configuration
Create `config/supabase.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
```

### 4.3 Create Cloudinary Configuration
Create `config/cloudinary.js`:
```javascript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
```

### 4.4 Update Your server.js
Replace SQLite with Supabase:

```javascript
// Replace SQLite imports
const supabase = require('./config/supabase');
const cloudinary = require('./config/cloudinary');

// Update database operations
// OLD: db.get('SELECT * FROM users WHERE id = ?', [userId], callback)
// NEW: 
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

### 4.5 Update Image Upload Endpoints
Replace local file storage with Cloudinary:

```javascript
// Replace multer with Cloudinary
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
```

---

## Step 5: Update Render Environment Variables

### 5.1 Add All Variables to Render
1. Go to your Render service dashboard
2. Go to **"Environment"** tab
3. Add these variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
NODE_ENV=production
PORT=10000
```

### 5.2 Deploy Updated Code
1. Commit your changes to GitHub:
```bash
git add .
git commit -m "Add Supabase and Cloudinary integration"
git push origin main
```
2. Render will automatically redeploy your app

---

## Step 6: Test Your Setup

### 6.1 Test Supabase Connection
Create `test-supabase.js` in your backend directory:
```javascript
const supabase = require('./config/supabase');

async function testSupabase() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
    } else {
      console.log('✅ Supabase connected successfully!');
    }
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
  }
}

testSupabase();
```

Run it:
```bash
node test-supabase.js
```

### 6.2 Test Cloudinary Connection
Create `test-cloudinary.js`:
```javascript
const cloudinary = require('./config/cloudinary');

async function testCloudinary() {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connected successfully!');
    console.log('Status:', result.status);
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error);
  }
}

testCloudinary();
```

Run it:
```bash
node test-cloudinary.js
```

### 6.3 Test Your API
1. Go to your Render deployment URL
2. Test the health endpoint: `https://trumpet-backend.onrender.com/api/health`
3. You should see: `{"status":"OK","message":"Trumpet API is running"}`

---

## Step 7: Update Frontend Configuration

### 7.1 Update API Base URL
In your frontend, update the API base URL to your Render deployment:

```javascript
// In your frontend config
const API_BASE_URL = 'https://trumpet-backend.onrender.com/api';

// Update all API calls to use this URL
```

### 7.2 Test Image Upload
1. Try uploading an image through your frontend
2. Check if it appears in your Cloudinary dashboard
3. Verify the image URL is saved in your Supabase database

---

## Step 8: Monitor Your Services

### 8.1 Render Monitoring
- **Dashboard**: [render.com/dashboard](https://render.com/dashboard)
- **Logs**: View real-time logs in Render dashboard
- **Metrics**: Monitor CPU, memory, and network usage
- **Sleep**: Apps sleep after 15 minutes of inactivity

### 8.2 Supabase Monitoring
- **Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)
- **Database**: Monitor database size and connections
- **Storage**: Monitor file storage usage
- **Auth**: Monitor user authentication

### 8.3 Cloudinary Monitoring
- **Dashboard**: [cloudinary.com/console](https://cloudinary.com/console)
- **Usage**: Monitor storage and bandwidth usage
- **Analytics**: View image performance metrics

---

## 🎯 Final Setup Summary

### What You'll Have:
- **Backend**: Hosted on Render (100% FREE)
- **Database**: 500MB PostgreSQL on Supabase
- **Storage**: 1GB on Supabase + 25GB on Cloudinary
- **Auth**: Built-in Supabase authentication
- **Real-time**: Built-in Supabase real-time features
- **Total Cost**: **$0/month** (forever free!)

### Your URLs:
- **Backend API**: `https://trumpet-backend.onrender.com`
- **Database**: Supabase dashboard
- **Images**: Cloudinary CDN URLs

### Render Benefits:
- ✅ **100% Free** (no credit system)
- ✅ **Unlimited deployments**
- ✅ **Automatic SSL**
- ✅ **Custom domains**
- ✅ **Auto-deploy on git push**

### Render Limitations:
- ⚠️ **Sleeps after 15 minutes** of inactivity
- ⚠️ **Cold start** when waking up (2-3 seconds)
- ⚠️ **Free tier limits**: 750 hours/month

---

## 🆘 Troubleshooting

### Common Issues:

**1. Supabase Connection Failed**
- Check Supabase credentials
- Verify project is created
- Check RLS policies

**2. Cloudinary Upload Failed**
- Verify API credentials
- Check upload permissions
- Test with small image first

**3. Render Deployment Failed**
- Check environment variables
- Verify all dependencies are installed
- Check build logs in Render dashboard

**4. CORS Issues**
- Update CORS settings in your backend
- Add your frontend domain to allowed origins

**5. App Sleeping**
- Render free tier apps sleep after 15 minutes
- First request after sleep takes 2-3 seconds
- This is normal for free tier

### Getting Help:
- **Render**: [render.com/docs](https://render.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Cloudinary**: [cloudinary.com/documentation](https://cloudinary.com/documentation)

---

## 🎉 Congratulations!

You now have a professional-grade backend setup that can handle:
- ✅ Thousands of users
- ✅ Unlimited images (25GB free)
- ✅ Real-time features
- ✅ Global CDN for fast image delivery
- ✅ Scalable database
- ✅ Built-in authentication
- ✅ All for FREE (no credit system!)

Your Trumpet social media app is ready to scale! 🚀

---

## 📞 Next Steps

1. ✅ Set up Render account
2. ✅ Set up Supabase database
3. ✅ Set up Cloudinary account
4. ✅ Update backend code
5. ✅ Deploy to Render
6. ✅ Test everything
7. ✅ Update frontend
8. ✅ Monitor services

**Ready to start? Let's begin with Step 1!** 🚀
