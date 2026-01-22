const axios = require('axios');

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MODEL = 'llama3.2';

async function testOllama() {
    console.log('🧪 Testing Ollama Connection...\n');

    try {
        // Test 1: Check if Ollama is running
        console.log('1️⃣ Checking if Ollama is running...');
        const tagsResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
        console.log('✅ Ollama is running!');
        console.log('📦 Available models:', tagsResponse.data.models?.map(m => m.name).join(', ') || 'None');

        // Test 2: Check if llama3.2 is available
        console.log('\n2️⃣ Checking if llama3.2 model is available...');
        const hasModel = tagsResponse.data.models?.some(m => m.name.includes('llama3.2'));
        if (hasModel) {
            console.log('✅ llama3.2 model is installed!');
        } else {
            console.log('❌ llama3.2 model NOT found!');
            console.log('💡 Run: ollama pull llama3.2');
            return;
        }

        // Test 3: Send a test message
        console.log('\n3️⃣ Testing chat functionality...');
        const testMessage = 'What is machine learning? Answer in one sentence.';
        console.log('📤 Sending:', testMessage);

        const startTime = Date.now();
        const chatResponse = await axios.post(
            `${OLLAMA_BASE_URL}/api/chat`,
            {
                model: MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI assistant. Provide clear, concise answers.'
                    },
                    {
                        role: 'user',
                        content: testMessage
                    }
                ],
                stream: false
            },
            { timeout: 60000 }
        );

        const responseTime = Date.now() - startTime;
        const aiResponse = chatResponse.data.message.content;

        console.log('✅ Chat test successful!');
        console.log('📥 Response:', aiResponse);
        console.log(`⏱️  Response time: ${responseTime}ms`);

        console.log('\n🎉 All tests passed! Ollama is ready to use.');

    } catch (error) {
        console.error('\n❌ Test failed!');

        if (error.code === 'ECONNREFUSED') {
            console.error('⚠️  Ollama is not running!');
            console.error('💡 Start Ollama by running: ollama serve');
        } else if (error.response?.status === 404) {
            console.error('⚠️  Model not found!');
            console.error('💡 Install the model: ollama pull llama3.2');
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
testOllama();
