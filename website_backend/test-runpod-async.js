const axios = require('axios');

require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

async function testRunPodAsync() {
    console.log('🧪 Testing RunPod Connection (Async Method)...');
    console.log('📍 Endpoint:', RUNPOD_ENDPOINT_ID);

    try {
        // Try the /run endpoint (async)
        const response = await axios.post(
            `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
            {
                input: {
                    prompt: "Say hello!"
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('\n✅ Job submitted! Response:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('\n❌ ERROR:');
        console.log('Status:', error.response?.status);
        console.log('Status Text:', error.response?.statusText);
        console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Error Message:', error.message);
    }
}

testRunPodAsync();
