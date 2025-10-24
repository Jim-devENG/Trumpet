// Test database connection and table existence
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyhqegfijgkzotopvhcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aHFlZ2Zpamdrem90b3B2aGNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0OTYwMCwiZXhwIjoyMDc2ODI1NjAwfQ.7nUv9gJCkB_Te7ZaIZTeyr48dAZoqGrijw9vbHcf8oA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check if users table exists
    console.log('\n1. Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table exists');
    }
    
    // Test 2: Check if posts table exists
    console.log('\n2. Testing posts table...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .limit(1);
    
    if (postsError) {
      console.log('❌ Posts table error:', postsError.message);
    } else {
      console.log('✅ Posts table exists');
    }
    
    // Test 3: Try to create a test post
    console.log('\n3. Testing post creation...');
    const { data: newPost, error: createError } = await supabase
      .from('posts')
      .insert({
        author_id: 'dd371475-c9e8-4927-a2ed-640f1549c47c',
        content: 'Test post from database test'
      })
      .select();
    
    if (createError) {
      console.log('❌ Post creation error:', createError.message);
    } else {
      console.log('✅ Post created successfully:', newPost);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDatabase();
