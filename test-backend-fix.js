// Test script to verify if the backend database fix is working
const fetch = require('node-fetch');

async function testBackendFix() {
    const backendUrl = 'https://trumpet-backend.onrender.com';
    
    console.log('🧪 Testing Backend Database Fix...\n');
    
    try {
        // Test 1: Health check
        console.log('1. Testing health check...');
        const healthResponse = await fetch(`${backendUrl}/api/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);
        
        // Test 2: Test posts endpoint (this was failing before)
        console.log('\n2. Testing posts endpoint...');
        const postsResponse = await fetch(`${backendUrl}/api/posts`);
        const postsData = await postsResponse.json();
        
        if (postsResponse.status === 200) {
            console.log('✅ Posts endpoint working! Status:', postsResponse.status);
            console.log('📊 Posts data:', postsData);
        } else {
            console.log('❌ Posts endpoint still failing. Status:', postsResponse.status);
            console.log('📊 Error data:', postsData);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBackendFix();
