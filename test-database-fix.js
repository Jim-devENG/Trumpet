// Simple test to check if database is working
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyhqegfijgkzotopvhcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aHFlZ2Zpamdrem90b3B2aGNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0OTYwMCwiZXhwIjoyMDc2ODI1NjAwfQ.7nUv9gJCkB_Te7ZaIZTeyr48dAZoqGrijw9vbHcf8oA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test if we can read from posts table
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .limit(1);
    
    if (postsError) {
      console.log('❌ Posts table error:', postsError.message);
      console.log('🔧 This confirms the database schema issue!');
      return false;
    } else {
      console.log('✅ Posts table is working!');
      console.log('📊 Found', posts.length, 'posts');
      return true;
    }
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

testDatabase();
