require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Testing Gemini API Key:', apiKey ? 'Key found' : 'Key MISSING');
    
    if (!apiKey) {
        process.exit(1);
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        console.log(`Sending test message to [${modelName}]: "Hello, who are you?"`);
        const result = await model.generateContent("Hello, who are you?");
        const response = await result.response;
        const text = response.text();
        
        console.log('\n✅ SUCCESS! [gemini-2.5-flash] responded:');
        console.log('-----------------------------------');
        console.log(text);
        console.log('-----------------------------------');
        
    } catch (error) {
        console.error('\n⚠️ [gemini-2.5-flash] FAILED! Gemini API Error:', error.message);
        
        console.log('\nTrying fallback model [gemini-1.5-flash]...');
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model15 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result15 = await model15.generateContent("Hello, are you working?");
            const response15 = await result15.response;
            console.log('\n✅ SUCCESS! [gemini-1.5-flash] responded:');
            console.log('-----------------------------------');
            console.log(response15.text());
            console.log('-----------------------------------');
        } catch (err2) {
            console.error('\n❌ BOTH MODELS FAILED! Gemini API Error:', err2.message);
        }
    }
}

testGemini();
