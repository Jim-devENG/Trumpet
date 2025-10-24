// Test to check if database tables exist
const https = require('https');

function testDatabaseStatus() {
    console.log('🔍 Checking Database Status...\n');
    
    // Test posts endpoint to see what error we get
    const options = {
        hostname: 'trumpet-backend.onrender.com',
        port: 443,
        path: '/api/posts',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMThiNTNiZC1iZTQ3LTRhOTItYThjOC1jMzdkNjk5ODM1MzEiLCJpYXQiOjE3NjEyNjQxMjQsImV4cCI6MTc2MTg2ODkyNH0.XT6NJ_aWnokopmESWtyvkUXT9-ADIzXNu8BDkzJTdyY',
            'Content-Type': 'application/json'
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📊 Posts endpoint status:', res.statusCode);
            console.log('📊 Response:', data);
            
            if (res.statusCode === 500) {
                console.log('\n❌ DATABASE ERROR CONFIRMED!');
                console.log('🔧 The database tables are not properly set up.');
                console.log('📋 You need to run the SQL script in Supabase to fix this.');
                console.log('\n👉 Go to: https://supabase.com/dashboard/project/jyhqegfijgkzotopvhcg/sql');
                console.log('👉 Copy and paste the SQL code from FINAL_DATABASE_FIX.html');
                console.log('👉 Click "Run" to execute the script');
            } else if (res.statusCode === 200) {
                console.log('\n✅ Database is working correctly!');
            } else {
                console.log('\n⚠️ Unexpected status code:', res.statusCode);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Test failed:', error.message);
    });
    
    req.end();
}

testDatabaseStatus();
