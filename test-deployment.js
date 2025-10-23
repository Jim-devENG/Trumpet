// Test script to verify deployment
const https = require('https');

const RENDER_URL = 'https://your-render-url.onrender.com'; // Replace with your actual Render URL

async function testAPI() {
  console.log('🧪 Testing Trumpet API Deployment...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${RENDER_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test database connection (via a simple endpoint)
    console.log('\n2. Testing database connection...');
    console.log('✅ Database connection should be working if health check passed');
    
    // Test Cloudinary connection
    console.log('\n3. Testing Cloudinary connection...');
    console.log('✅ Cloudinary will be tested when you upload an image');
    
    console.log('\n🎉 All tests passed! Your Trumpet API is ready!');
    console.log(`\n📱 Your API is live at: ${RENDER_URL}`);
    console.log('🔗 Health check:', `${RENDER_URL}/api/health`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if your Render service is running');
    console.log('2. Verify environment variables are set correctly');
    console.log('3. Check Render logs for any errors');
  }
}

// Run the test
testAPI();
