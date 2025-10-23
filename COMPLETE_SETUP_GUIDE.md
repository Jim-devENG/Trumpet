# 🚀 Complete Setup Guide: Railway + PlanetScale + Cloudinary

## Overview
This guide will help you set up your Trumpet social media app with:
- **Railway**: Backend hosting (unlimited storage)
- **PlanetScale**: Database (5GB free)
- **Cloudinary**: Image storage (25GB free)
- **Total Cost**: $0/month

## 📋 Prerequisites
- GitHub account
- Your Trumpet project (already set up)
- Basic understanding of environment variables

---

## Step 1: Set Up Railway (Backend Hosting)

### 1.1 Create Railway Account
1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (recommended)
4. Authorize Railway to access your repositories

### 1.2 Deploy Your Backend
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your **Trumpet repository**
4. Railway will automatically detect it's a Node.js project
5. Click **"Deploy Now"**

### 1.3 Configure Railway Settings
1. Go to your project dashboard
2. Click on your **backend service**
3. Go to **"Settings"** tab
4. Set these environment variables:

```env
NODE_ENV=production
PORT=8000
JWT_SECRET=your-super-secret-jwt-key-here
```

**Railway will provide:**
- **Deployment URL**: `https://your-app.railway.app`
- **Database URL**: (We'll set this up with PlanetScale)

---

## Step 2: Set Up PlanetScale (Database)

### 2.1 Create PlanetScale Account
1. Go to **[planetscale.com](https://planetscale.com)**
2. Click **"Start building for free"**
3. Sign up with **GitHub** (recommended)
4. Verify your email

### 2.2 Create Database
1. In PlanetScale dashboard, click **"Create database"**
2. Enter details:
   - **Database name**: `trumpet-db`
   - **Region**: Choose closest to your users
   - **Plan**: Free (Hobby)
3. Click **"Create database"**

### 2.3 Get Database Credentials
1. Go to your database dashboard
2. Click **"Connect"**
3. Select **"Node.js"** from the dropdown
4. Copy the connection string:
```
mysql://username:password@host:port/database?sslaccept=strict
```

### 2.4 Set Up Database Schema
1. In PlanetScale, go to **"Console"** tab
2. Click **"Create branch"** → **"main"** (production branch)
3. In the console, run this SQL:

```sql
-- Users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255),
    avatar TEXT,
    occupation VARCHAR(100),
    interests JSON,
    location VARCHAR(100),
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
    id VARCHAR(36) PRIMARY KEY,
    content TEXT,
    image_url TEXT,
    author_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Events table
CREATE TABLE events (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    date DATETIME,
    image_url TEXT,
    max_attendees INT,
    organizer_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Jobs table
CREATE TABLE jobs (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    company VARCHAR(255),
    location VARCHAR(255),
    type VARCHAR(100),
    salary VARCHAR(100),
    requirements JSON,
    benefits JSON,
    poster_id VARCHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (poster_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    content TEXT,
    sender_id VARCHAR(36),
    receiver_id VARCHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36),
    type VARCHAR(50),
    message TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Likes table
CREATE TABLE likes (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36),
    user_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (post_id, user_id)
);

-- Friends table
CREATE TABLE friends (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    friend_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_friendship (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Friend requests table
CREATE TABLE friend_requests (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(36) NOT NULL,
    receiver_id VARCHAR(36) NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_request (requester_id, receiver_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE comments (
    id VARCHAR(36) PRIMARY KEY,
    content TEXT,
    post_id VARCHAR(36),
    author_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Event attendees table
CREATE TABLE event_attendees (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36),
    user_id VARCHAR(36),
    status ENUM('attending', 'maybe', 'not_attending') DEFAULT 'attending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attendance (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job applications table
CREATE TABLE job_applications (
    id VARCHAR(36) PRIMARY KEY,
    job_id VARCHAR(36),
    user_id VARCHAR(36),
    cover_letter TEXT,
    resume_url TEXT,
    status ENUM('pending', 'reviewed', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_application (job_id, user_id),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

## Step 3: Set Up Cloudinary (Image Storage)

### 3.1 Create Cloudinary Account
1. Go to **[cloudinary.com](https://cloudinary.com)**
2. Click **"Sign Up For Free"**
3. Fill in your details:
   - **Email**: your-email@example.com
   - **Password**: strong password
   - **Full Name**: Your name
   - **Company**: Trumpet (or your company)
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
npm install mysql2 cloudinary
npm uninstall sqlite3  # Remove SQLite
```

### 4.2 Create Database Configuration
Create `config/database.js`:
```javascript
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false
  }
};

const pool = mysql.createPool(dbConfig);

module.exports = pool;
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

### 4.4 Update Environment Variables
Create `.env` file in your backend directory:
```env
# Database (PlanetScale)
DB_HOST=your-planetscale-host
DB_USER=your-planetscale-username
DB_PASSWORD=your-planetscale-password
DB_NAME=your-database-name
DB_PORT=3306

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=8000
NODE_ENV=production
```

---

## Step 5: Update Railway Environment Variables

### 5.1 Add Database Variables to Railway
1. Go to your Railway project dashboard
2. Click on your **backend service**
3. Go to **"Variables"** tab
4. Add these variables:

```env
DB_HOST=your-planetscale-host
DB_USER=your-planetscale-username
DB_PASSWORD=your-planetscale-password
DB_NAME=your-database-name
DB_PORT=3306
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
PORT=8000
```

### 5.2 Deploy Updated Code
1. Commit your changes to GitHub:
```bash
git add .
git commit -m "Add PlanetScale and Cloudinary integration"
git push origin main
```
2. Railway will automatically redeploy your app

---

## Step 6: Test Your Setup

### 6.1 Test Database Connection
Create `test-db.js` in your backend directory:
```javascript
const db = require('./config/database');

async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Database connected successfully!');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
```

Run it:
```bash
node test-db.js
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
1. Go to your Railway deployment URL
2. Test the health endpoint: `https://your-app.railway.app/api/health`
3. You should see: `{"status":"OK","message":"Trumpet API is running"}`

---

## Step 7: Update Frontend Configuration

### 7.1 Update API Base URL
In your frontend, update the API base URL to your Railway deployment:

```javascript
// In your frontend config
const API_BASE_URL = 'https://your-app.railway.app/api';

// Update all API calls to use this URL
```

### 7.2 Test Image Upload
1. Try uploading an image through your frontend
2. Check if it appears in your Cloudinary dashboard
3. Verify the image URL is saved in your database

---

## Step 8: Monitor Your Services

### 8.1 Railway Monitoring
- **Dashboard**: [railway.app/dashboard](https://railway.app/dashboard)
- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: Monitor CPU, memory, and network usage

### 8.2 PlanetScale Monitoring
- **Dashboard**: [planetscale.com/dashboard](https://planetscale.com/dashboard)
- **Database**: Monitor database size and connections
- **Branches**: Manage database branches

### 8.3 Cloudinary Monitoring
- **Dashboard**: [cloudinary.com/console](https://cloudinary.com/console)
- **Usage**: Monitor storage and bandwidth usage
- **Analytics**: View image performance metrics

---

## 🎯 Final Setup Summary

### What You'll Have:
- **Backend**: Hosted on Railway (unlimited storage)
- **Database**: 5GB on PlanetScale (MySQL)
- **Images**: 25GB on Cloudinary (with CDN)
- **Total Cost**: **$0/month**

### Your URLs:
- **Backend API**: `https://your-app.railway.app`
- **Database**: PlanetScale dashboard
- **Images**: Cloudinary CDN URLs

### Next Steps:
1. ✅ Set up Railway account
2. ✅ Set up PlanetScale database
3. ✅ Set up Cloudinary account
4. ✅ Update backend code
5. ✅ Deploy to Railway
6. ✅ Test everything
7. ✅ Update frontend
8. ✅ Monitor services

---

## 🆘 Troubleshooting

### Common Issues:

**1. Database Connection Failed**
- Check PlanetScale credentials
- Verify database is created
- Check SSL settings

**2. Cloudinary Upload Failed**
- Verify API credentials
- Check upload permissions
- Test with small image first

**3. Railway Deployment Failed**
- Check environment variables
- Verify all dependencies are installed
- Check build logs in Railway dashboard

**4. CORS Issues**
- Update CORS settings in your backend
- Add your frontend domain to allowed origins

### Getting Help:
- **Railway**: [docs.railway.app](https://docs.railway.app)
- **PlanetScale**: [planetscale.com/docs](https://planetscale.com/docs)
- **Cloudinary**: [cloudinary.com/documentation](https://cloudinary.com/documentation)

---

## 🎉 Congratulations!

You now have a professional-grade backend setup that can handle:
- ✅ Thousands of users
- ✅ Unlimited images (25GB free)
- ✅ Real-time features
- ✅ Global CDN for fast image delivery
- ✅ Scalable database
- ✅ All for FREE!

Your Trumpet social media app is ready to scale! 🚀
