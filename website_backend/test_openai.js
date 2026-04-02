require('dotenv').config();
const axios = require('axios');

async function testOpenAI() {
    const apiKey = process.env.OPENAI_LLM_API_KEY;
    console.log('Testing OpenAI LLM API Key:', apiKey ? 'Key found' : 'Key MISSING');
    
    if (!apiKey) {
        process.exit(1);
    }

    try {
        console.log('Sending test message to OpenAI: "Hello, who are you?"');
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: "Hello, who are you?" }],
                max_tokens: 100
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('\n✅ SUCCESS! OpenAI responded:');
        console.log('-----------------------------------');
        console.log(response.data.choices[0].message.content);
        console.log('-----------------------------------');
        
    } catch (error) {
        console.error('\n❌ FAILED! OpenAI API Error:');
        console.error(error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testOpenAI();
