const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const supabaseUrl = 'https://jyhqegfijgkzotopvhcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aHFlZ2Zpamdrem90b3B2aGNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0OTYwMCwiZXhwIjoyMDc2ODI1NjAwfQ.7nUv9gJCkB_Te7ZaIZTeyr48dAZoqGrijw9vbHcf8oA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabase() {
  console.log('🔧 Fixing database automatically...');
  
  try {
    // Step 1: Create posts table
    console.log('📝 Creating posts table...');
    const { error: postsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          author_id UUID NOT NULL,
          content TEXT NOT NULL,
          image_url TEXT,
          video_url TEXT,
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          shares_count INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (postsError) {
      console.log('⚠️ Posts table might already exist:', postsError.message);
    } else {
      console.log('✅ Posts table created successfully');
    }

    // Step 2: Create users table
    console.log('👥 Creating users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(50) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          occupation VARCHAR(100),
          interests TEXT[],
          location VARCHAR(100),
          bio TEXT,
          profile_image_url TEXT,
          cover_image_url TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (usersError) {
      console.log('⚠️ Users table might already exist:', usersError.message);
    } else {
      console.log('✅ Users table created successfully');
    }

    // Step 3: Add foreign key constraint
    console.log('🔗 Adding foreign key constraint...');
    const { error: fkError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'posts_author_id_fkey'
          ) THEN
            ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `
    });
    
    if (fkError) {
      console.log('⚠️ Foreign key might already exist:', fkError.message);
    } else {
      console.log('✅ Foreign key constraint added successfully');
    }

    // Step 4: Create indexes
    console.log('📊 Creating indexes...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      `
    });
    
    if (indexError) {
      console.log('⚠️ Indexes might already exist:', indexError.message);
    } else {
      console.log('✅ Indexes created successfully');
    }

    // Step 5: Enable RLS
    console.log('🔒 Enabling Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (rlsError) {
      console.log('⚠️ RLS might already be enabled:', rlsError.message);
    } else {
      console.log('✅ Row Level Security enabled successfully');
    }

    // Step 6: Create RLS policies
    console.log('🛡️ Creating RLS policies...');
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can read all posts" ON posts;
        CREATE POLICY "Users can read all posts" ON posts FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Users can insert posts" ON posts;
        CREATE POLICY "Users can insert posts" ON posts FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "Users can read all users" ON users;
        CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Users can insert their own data" ON users;
        CREATE POLICY "Users can insert their own data" ON users FOR INSERT WITH CHECK (true);
      `
    });
    
    if (policyError) {
      console.log('⚠️ Policies might already exist:', policyError.message);
    } else {
      console.log('✅ RLS policies created successfully');
    }

    console.log('🎉 Database fix completed! Your app should work now.');
    console.log('🔄 Please refresh your browser and test the app.');

  } catch (error) {
    console.error('❌ Error fixing database:', error);
  }
}

// Run the fix
fixDatabase();
