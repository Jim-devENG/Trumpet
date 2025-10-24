// Test database connection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyhqegfijgkzotopvhcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aHFlZ2Zpamdrem90b3B2aGNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0OTYwMCwiZXhwIjoyMDc2ODI1NjAwfQ.7nUv9gJCkB_Te7ZaIZTeyr48dAZoqGrijw9vbHcf8oA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test 1: Check if posts table exists
    console.log('📋 Testing posts table...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(1);
    
    if (postsError) {
      console.error('❌ Posts table error:', postsError);
      return;
    }
    
    console.log('✅ Posts table accessible');
    console.log('📊 Posts count:', posts?.length || 0);
    
    // Test 2: Check if users table exists
    console.log('👥 Testing users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError);
      return;
    }
    
    console.log('✅ Users table accessible');
    console.log('👤 Users count:', users?.length || 0);
    
    // Test 3: Try to insert a test post
    console.log('📝 Testing post creation...');
    const testPost = {
      id: 'test-' + Date.now(),
      content: 'Test post from connection test',
      author_id: users?.[0]?.id || '00000000-0000-0000-0000-000000000000'
    };
    
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert(testPost)
      .select('*')
      .single();
    
    if (insertError) {
      console.error('❌ Post creation error:', insertError);
      return;
    }
    
    console.log('✅ Post creation successful');
    console.log('📄 Created post:', newPost);
    
    // Clean up test post
    await supabase
      .from('posts')
      .delete()
      .eq('id', testPost.id);
    
    console.log('🧹 Test post cleaned up');
    console.log('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('💥 Database test failed:', error);
  }
}

testDatabase();