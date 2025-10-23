// Automated API testing script
const https = require('https');

const API_BASE_URL = 'https://trumpet-backend.onrender.com';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Testing Trumpet API Deployment...\n');
  console.log(`📡 API Base URL: ${API_BASE_URL}\n`);
  
  let allTestsPassed = true;
  
  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await makeRequest(`${API_BASE_URL}/api/health`);
    
    if (healthResponse.status === 200 && healthResponse.data.status === 'OK') {
      console.log('✅ Health Check: PASSED');
      console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
    } else {
      console.log('❌ Health Check: FAILED');
      console.log(`   Status: ${healthResponse.status}`);
      console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
      allTestsPassed = false;
    }
    
    console.log('');
    
    // Test 2: User Registration
    console.log('2️⃣ Testing User Registration...');
    const registrationData = {
      email: `test-${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      firstName: 'Test',
      lastName: 'User',
      password: 'password123'
    };
    
    const registrationResponse = await makeRequest(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationData)
    });
    
    if (registrationResponse.status === 201 && registrationResponse.data.success) {
      console.log('✅ User Registration: PASSED');
      console.log(`   User ID: ${registrationResponse.data.data.user.id}`);
      console.log(`   Username: ${registrationResponse.data.data.user.username}`);
      
      // Store token for next tests
      global.testToken = registrationResponse.data.data.token;
      global.testUserId = registrationResponse.data.data.user.id;
    } else {
      console.log('❌ User Registration: FAILED');
      console.log(`   Status: ${registrationResponse.status}`);
      console.log(`   Response: ${JSON.stringify(registrationResponse.data)}`);
      allTestsPassed = false;
    }
    
    console.log('');
    
    // Test 3: User Login
    console.log('3️⃣ Testing User Login...');
    const loginResponse = await makeRequest(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: registrationData.email,
        password: registrationData.password
      })
    });
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      console.log('✅ User Login: PASSED');
      console.log(`   Token received: ${loginResponse.data.data.token.substring(0, 20)}...`);
    } else {
      console.log('❌ User Login: FAILED');
      console.log(`   Status: ${loginResponse.status}`);
      console.log(`   Response: ${JSON.stringify(loginResponse.data)}`);
      allTestsPassed = false;
    }
    
    console.log('');
    
    // Test 4: Get User Profile (if we have a token)
    if (global.testToken) {
      console.log('4️⃣ Testing Get User Profile...');
      const profileResponse = await makeRequest(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.testToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.status === 200 && profileResponse.data.success) {
        console.log('✅ Get User Profile: PASSED');
        console.log(`   User: ${profileResponse.data.data.user.firstName} ${profileResponse.data.data.user.lastName}`);
      } else {
        console.log('❌ Get User Profile: FAILED');
        console.log(`   Status: ${profileResponse.status}`);
        console.log(`   Response: ${JSON.stringify(profileResponse.data)}`);
        allTestsPassed = false;
      }
    }
    
    console.log('');
    
    // Test 5: Create Post (if we have a token)
    if (global.testToken) {
      console.log('5️⃣ Testing Create Post...');
      const postData = {
        content: 'This is a test post from the automated test! 🚀',
        imageBase64: null
      };
      
      const postResponse = await makeRequest(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${global.testToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });
      
      if (postResponse.status === 201 && postResponse.data.success) {
        console.log('✅ Create Post: PASSED');
        console.log(`   Post ID: ${postResponse.data.data.post.id}`);
        console.log(`   Content: ${postResponse.data.data.post.content}`);
      } else {
        console.log('❌ Create Post: FAILED');
        console.log(`   Status: ${postResponse.status}`);
        console.log(`   Response: ${JSON.stringify(postResponse.data)}`);
        allTestsPassed = false;
      }
    }
    
    console.log('');
    
    // Test 6: Get Posts
    console.log('6️⃣ Testing Get Posts...');
    const postsResponse = await makeRequest(`${API_BASE_URL}/api/posts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${global.testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (postsResponse.status === 200 && postsResponse.data.success) {
      console.log('✅ Get Posts: PASSED');
      console.log(`   Posts count: ${postsResponse.data.data.length}`);
    } else {
      console.log('❌ Get Posts: FAILED');
      console.log(`   Status: ${postsResponse.status}`);
      console.log(`   Response: ${JSON.stringify(postsResponse.data)}`);
      allTestsPassed = false;
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED! Your Trumpet API is working perfectly!');
      console.log('\n📊 Summary:');
      console.log('✅ Health Check - Working');
      console.log('✅ User Registration - Working');
      console.log('✅ User Login - Working');
      console.log('✅ User Profile - Working');
      console.log('✅ Create Post - Working');
      console.log('✅ Get Posts - Working');
      console.log('\n🚀 Your Trumpet social media app is ready to go live!');
      console.log(`📱 API URL: ${API_BASE_URL}`);
    } else {
      console.log('❌ SOME TESTS FAILED! Check the errors above.');
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check if your Render service is running');
      console.log('2. Verify environment variables are set correctly');
      console.log('3. Check Render logs for any errors');
      console.log('4. Make sure Supabase database is accessible');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if your Render service is running');
    console.log('2. Verify the API URL is correct');
    console.log('3. Check network connectivity');
  }
}

// Run the automated test
testAPI();
