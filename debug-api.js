// Debug script to test API connectivity
// Run this with: node debug-api.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAPI() {
  // Load environment variables
  require('dotenv').config();
  
  const apiKey = process.env.REACT_APP_GCP_API_KEY;
  
  console.log('🔍 API Debug Test');
  console.log('================');
  
  if (!apiKey) {
    console.log('❌ No API key found in .env file');
    console.log('   Make sure REACT_APP_GCP_API_KEY is set');
    return;
  }
  
  console.log('✅ API key found in .env file');
  console.log(`   Key starts with: ${apiKey.substring(0, 10)}...`);
  
  try {
    console.log('\n🔄 Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('✅ Gemini AI initialized successfully');
    
    console.log('\n🔄 Testing API call...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API call successful!');
    console.log(`   Response: "${text}"`);
    
  } catch (error) {
    console.log('❌ API call failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 This looks like an API key issue. Try:');
      console.log('   1. Check that your API key is correct');
      console.log('   2. Make sure the Generative AI API is enabled');
      console.log('   3. Verify the API key has proper permissions');
    } else if (error.message.includes('quota')) {
      console.log('\n💡 This looks like a quota issue. Try:');
      console.log('   1. Check your GCP billing and quotas');
      console.log('   2. Wait a bit and try again');
    } else if (error.message.includes('network')) {
      console.log('\n💡 This looks like a network issue. Try:');
      console.log('   1. Check your internet connection');
      console.log('   2. Try again in a few minutes');
    }
  }
}

testAPI().catch(console.error);
