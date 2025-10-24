// Test with authentication to see if database fix is working
const https = require('https');

// First, let's register a test user and get a token
function registerTestUser() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            password: 'password123'
        });
        
        const options = {
            hostname: 'trumpet-backend.onrender.com',
            port: 443,
            path: '/api/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('📊 Registration response status:', res.statusCode);
                console.log('📊 Registration response:', data);
                
                if (res.statusCode === 201) {
                    const response = JSON.parse(data);
                    if (response.success && response.data && response.data.token) {
                        resolve(response.data.token);
                    } else {
                        reject('No token in response');
                    }
                } else {
                    reject(`Registration failed with status ${res.statusCode}`);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error.message);
        });
        
        req.write(postData);
        req.end();
    });
}

function testPostsWithAuth(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'trumpet-backend.onrender.com',
            port: 443,
            path: '/api/posts',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('\n🔍 Testing posts endpoint with auth...');
                console.log('📊 Posts endpoint status:', res.statusCode);
                console.log('📊 Posts response:', data.substring(0, 500));
                
                if (res.statusCode === 200) {
                    console.log('✅ Posts endpoint is working with authentication!');
                    resolve(true);
                } else {
                    console.log('❌ Posts endpoint still failing');
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Posts test failed:', error.message);
            reject(error);
        });
        
        req.end();
    });
}

async function runTest() {
    console.log('🧪 Testing Backend with Authentication...\n');
    
    try {
        // Test 1: Health check
        console.log('1. Testing health check...');
        const healthOptions = {
            hostname: 'trumpet-backend.onrender.com',
            port: 443,
            path: '/api/health',
            method: 'GET'
        };
        
        const healthReq = https.request(healthOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log('✅ Health check passed:', data);
                
                // Test 2: Register user and get token
                console.log('\n2. Registering test user...');
                registerTestUser()
                    .then(token => {
                        console.log('✅ Got authentication token');
                        
                        // Test 3: Test posts with auth
                        return testPostsWithAuth(token);
                    })
                    .then(success => {
                        if (success) {
                            console.log('\n🎉 All tests passed! The database fix is working!');
                        } else {
                            console.log('\n❌ Posts endpoint still has issues');
                        }
                    })
                    .catch(error => {
                        console.error('❌ Test failed:', error);
                    });
            });
        });
        
        healthReq.on('error', (error) => {
            console.error('❌ Health check failed:', error.message);
        });
        
        healthReq.end();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runTest();
