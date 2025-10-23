# 📸 Cloudinary Integration for Trumpet Image Storage

## Overview
This guide shows how to integrate Cloudinary for unlimited image storage in your Trumpet social media app.

## Step 1: Cloudinary Setup

### 1.1 Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account
3. Get your credentials from dashboard:
   - **Cloud Name**: `your-cloud-name`
   - **API Key**: `123456789012345`
   - **API Secret**: `your-secret-key`

### 1.2 Install Cloudinary SDK
```bash
cd backend
npm install cloudinary
```

## Step 2: Environment Variables

Add to your `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-secret-key
```

## Step 3: Cloudinary Configuration

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

## Step 4: Update Image Upload Endpoints

### 4.1 Replace Multer with Cloudinary

**OLD (Local storage):**
```javascript
const multer = require('multer');
const upload = multer({ storage: multer.diskStorage({...}) });

app.post('/api/upload/image', authenticateToken, upload.single('image'), (req, res) => {
  // Local file handling
});
```

**NEW (Cloudinary):**
```javascript
const cloudinary = require('./config/cloudinary');

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
        { width: 1200, height: 1200, crop: 'limit' }, // Resize large images
        { quality: 'auto' }, // Auto optimize quality
        { format: 'auto' } // Auto format (webp when supported)
      ]
    });

    // Save image metadata to database
    const imageId = uuidv4();
    db.run(
      `INSERT INTO images (id, filename, original_name, file_path, file_size, mime_type, uploaded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [imageId, result.public_id, result.original_filename, result.secure_url, result.bytes, result.format, req.user.userId],
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
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            size: result.bytes
          }
        });
      }
    );
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});
```

### 4.2 Avatar Upload with Cloudinary

```javascript
app.post('/api/auth/avatar', authenticateToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    // Upload avatar with specific transformations
    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'trumpet/avatars',
      resource_type: 'image',
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' }, // Square crop, face detection
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    // Update user's avatar in database
    db.run(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [result.secure_url, req.user.userId],
      function(err) {
        if (err) {
          console.error('Error updating avatar:', err);
          return res.status(500).json({ success: false, message: 'Failed to update avatar' });
        }
        
        res.json({
          success: true,
          message: 'Avatar updated successfully',
          data: {
            avatar_url: result.secure_url
          }
        });
      }
    );
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});
```

### 4.3 Post Images with Cloudinary

```javascript
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { content, imageBase64 } = req.body;
    const postId = uuidv4();
    let imageUrl = null;

    // If image is provided, upload to Cloudinary
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
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
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without image
      }
    }

    // Save post to database
    db.run(
      'INSERT INTO posts (id, content, image_url, author_id) VALUES (?, ?, ?, ?)',
      [postId, content, imageUrl, req.user.userId],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: 'Failed to create post' });
        }

        res.status(201).json({
          success: true,
          message: 'Post created successfully',
          data: { 
            post: { 
              id: postId, 
              content, 
              image_url: imageUrl, 
              author_id: req.user.userId 
            } 
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
```

## Step 5: Image Optimization Features

### 5.1 Responsive Images
```javascript
// Generate responsive image URLs
const getResponsiveImageUrl = (publicId, width) => {
  return cloudinary.url(publicId, {
    width: width,
    crop: 'scale',
    quality: 'auto',
    format: 'auto'
  });
};

// Usage in your API
app.get('/api/images/:publicId/responsive', (req, res) => {
  const { publicId } = req.params;
  const { width = 800 } = req.query;
  
  const imageUrl = getResponsiveImageUrl(publicId, width);
  res.json({ success: true, data: { url: imageUrl } });
});
```

### 5.2 Image Transformations
```javascript
// Apply filters and effects
const applyImageFilters = (publicId, filters) => {
  return cloudinary.url(publicId, {
    transformation: [
      { width: 800, height: 600, crop: 'fill' },
      ...filters
    ]
  });
};

// Example: Vintage filter
const vintageImage = applyImageFilters('trumpet/posts/image123', [
  { effect: 'vintage' },
  { quality: 'auto' }
]);
```

## Step 6: Image Management

### 6.1 Delete Images
```javascript
app.delete('/api/images/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      // Delete from database
      db.run('DELETE FROM images WHERE public_id = ?', [publicId], function(err) {
        if (err) {
          console.error('Error deleting image from database:', err);
        }
        
        res.json({
          success: true,
          message: 'Image deleted successfully'
        });
      });
    } else {
      res.status(404).json({ success: false, message: 'Image not found' });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
});
```

### 6.2 Image Analytics
```javascript
// Get image usage statistics
app.get('/api/images/:publicId/analytics', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Get image details from Cloudinary
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'image'
    });
    
    res.json({
      success: true,
      data: {
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height,
        createdAt: result.created_at,
        url: result.secure_url
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get image analytics' });
  }
});
```

## Step 7: Frontend Integration

### 7.1 Image Upload Component
```javascript
// Frontend image upload with preview
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};

// Convert file to base64 for upload
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
```

## Step 8: Cost Analysis

### Cloudinary Free Tier:
- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: Unlimited
- **Cost**: **$0/month**

### Estimated Usage for Small Social Media App:
```
Users: 100-500
Images per user: 10-50
Average image size: 500KB
Total images: 1,000-25,000
Total storage needed: 500MB-12.5GB
Cloudinary free tier: 25GB ✅
```

## Step 9: Monitoring and Optimization

### 9.1 Image Compression
```javascript
// Auto-compress images on upload
const uploadWithCompression = async (imageBase64) => {
  return cloudinary.uploader.upload(imageBase64, {
    folder: 'trumpet/images',
    transformation: [
      { quality: 'auto:low' }, // Aggressive compression
      { format: 'auto' } // WebP when supported
    ]
  });
};
```

### 9.2 Usage Monitoring
```javascript
// Check Cloudinary usage
app.get('/api/admin/cloudinary-usage', authenticateToken, async (req, res) => {
  try {
    const result = await cloudinary.api.usage();
    
    res.json({
      success: true,
      data: {
        storage: result.storage,
        bandwidth: result.bandwidth,
        requests: result.requests,
        resources: result.resources
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get usage stats' });
  }
});
```

## 🎯 Benefits of This Setup:

1. **Unlimited Images**: 25GB free storage
2. **Global CDN**: Fast image delivery worldwide
3. **Auto Optimization**: Automatic compression and format conversion
4. **Responsive Images**: Different sizes for different devices
5. **Image Transformations**: Filters, effects, cropping
6. **Analytics**: Track image usage and performance
7. **Cost**: **100% FREE** for small to medium apps

This setup gives you **professional-grade image handling** for your social media app while staying completely free!
