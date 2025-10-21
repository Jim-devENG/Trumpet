const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize database
const db = new sqlite3.Database('./trumpet.db');

console.log('🔄 Starting image migration...');

// Function to get file stats
const getFileStats = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      exists: true
    };
  } catch (error) {
    return {
      size: 0,
      exists: false
    };
  }
};

// Function to migrate images
const migrateImages = () => {
  console.log('📊 Fetching posts with images...');
  
  db.all(`
    SELECT id, image_url, author_id, created_at 
    FROM posts 
    WHERE image_url IS NOT NULL AND image_url != ''
  `, [], (err, posts) => {
    if (err) {
      console.error('❌ Error fetching posts:', err);
      return;
    }
    
    console.log(`📝 Found ${posts.length} posts with images`);
    
    if (posts.length === 0) {
      console.log('✅ No posts with images to migrate');
      db.close();
      return;
    }
    
    let migrated = 0;
    let errors = 0;
    
    posts.forEach((post, index) => {
      const imagePath = post.image_url;
      const fullPath = path.join(__dirname, imagePath);
      const fileStats = getFileStats(fullPath);
      
      if (!fileStats.exists) {
        console.log(`⚠️  Image file not found: ${imagePath}`);
        errors++;
        return;
      }
      
      // Extract filename from path
      const filename = path.basename(imagePath);
      const imageId = uuidv4();
      
      // Insert into images table
      db.run(`
        INSERT INTO images (
          id, filename, original_name, file_path, file_size, 
          mime_type, width, height, uploaded_by, is_public, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        imageId,
        filename,
        filename,
        imagePath,
        fileStats.size,
        'image/png', // Default mime type
        0, // Width (would need image processing library)
        0, // Height
        post.author_id,
        1, // is_public
        post.created_at
      ], function(err) {
        if (err) {
          console.error(`❌ Error inserting image ${filename}:`, err);
          errors++;
        } else {
          console.log(`✅ Migrated image ${filename} (${fileStats.size} bytes)`);
          
          // Create relationship between image and post
          const relationshipId = uuidv4();
          db.run(`
            INSERT INTO image_relationships (
              id, image_id, entity_type, entity_id, relationship_type, display_order
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            relationshipId,
            imageId,
            'post',
            post.id,
            'primary',
            0
          ], (err) => {
            if (err) {
              console.error(`❌ Error creating relationship for ${filename}:`, err);
            } else {
              console.log(`🔗 Created relationship for ${filename}`);
            }
          });
          
          migrated++;
        }
        
        // Check if this is the last post
        if (index === posts.length - 1) {
          console.log(`\n📊 Migration Summary:`);
          console.log(`   ✅ Successfully migrated: ${migrated} images`);
          console.log(`   ❌ Errors: ${errors} images`);
          console.log(`   📁 Total processed: ${posts.length} posts`);
          
          if (migrated > 0) {
            console.log(`\n🎯 Next steps:`);
            console.log(`   1. Restart the backend server`);
            console.log(`   2. Test image display in frontend`);
            console.log(`   3. Images should now work with the new system!`);
          }
          
          db.close();
        }
      });
    });
  });
};

// Start migration
migrateImages();


