const axios = require('axios');

require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

async function testRunPod() {
    console.log('🧪 Testing RunPod Connection...');
    console.log('📍 Endpoint:', RUNPOD_ENDPOINT_ID);
    console.log('🔑 API Key:', RUNPOD_API_KEY.substring(0, 10) + '...');

    try {
        const response = await axios.post(
            `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
            {
                input: {
                    method_name: "chat",
                    input: {
                        model: "llama3.2",
                        messages: [
                            { role: "user", content: "Say hello!" }
                        ],
                        stream: false
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            }
        );

        console.log('\n✅ SUCCESS! Response:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('\n❌ ERROR:');
        console.log('Status:', error.response?.status);
        console.log('Status Text:', error.response?.statusText);
        console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Error Message:', error.message);
    }
}

testRunPod();
