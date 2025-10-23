// Simple API test
const https = require('https');

console.log('🧪 Testing Trumpet API...\n');

// Test health endpoint
const options = {
  hostname: 'trumpet-backend.onrender.com',
  port: 443,
  path: '/api/health',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.status === 'OK') {
        console.log('✅ Health check PASSED!');
        console.log('🎉 Your Trumpet API is working!');
        console.log('📱 API URL: https://trumpet-backend.onrender.com');
      } else {
        console.log('❌ Health check FAILED!');
      }
    } catch (e) {
      console.log('❌ Invalid JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.end();
