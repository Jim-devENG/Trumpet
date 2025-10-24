// Simple test to check if backend is working
const https = require('https');

function testBackend() {
    console.log('🧪 Testing Backend Database Fix...\n');
    
    const options = {
        hostname: 'trumpet-backend.onrender.com',
        port: 443,
        path: '/api/health',
        method: 'GET'
    };
    
    const req = https.request(options, (res) => {
        console.log('✅ Backend is responding! Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('📊 Health response:', data);
            
            // Now test posts endpoint
            testPostsEndpoint();
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Backend test failed:', error.message);
    });
    
    req.end();
}

function testPostsEndpoint() {
    console.log('\n🔍 Testing posts endpoint...');
    
    const options = {
        hostname: 'trumpet-backend.onrender.com',
        port: 443,
        path: '/api/posts',
        method: 'GET'
    };
    
    const req = https.request(options, (res) => {
        console.log('📊 Posts endpoint status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ Posts endpoint is working!');
                console.log('📊 Response:', data.substring(0, 200) + '...');
            } else {
                console.log('❌ Posts endpoint still failing');
                console.log('📊 Error response:', data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Posts test failed:', error.message);
    });
    
    req.end();
}

testBackend();
