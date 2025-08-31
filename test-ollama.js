// Test script to verify Ollama connectivity
// Run this with: node test-ollama.js

async function testOllama() {
  console.log('🔍 Testing Ollama Connection');
  console.log('==========================');
  
  try {
    // Test if Ollama service is running
    console.log('🔄 Checking Ollama service...');
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Ollama service is running');
    console.log(`   Available models: ${data.models.length}`);
    
    if (data.models.length > 0) {
      data.models.forEach(model => {
        console.log(`   - ${model.name} (${model.details?.parameter_size || 'Unknown size'})`);
      });
    }
    
    // Test a simple API call
    console.log('\n🔄 Testing API call...');
    const testResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt: 'Hello, this is a test.',
        stream: false
      })
    });
    
    if (!testResponse.ok) {
      throw new Error(`API call failed: ${testResponse.status}`);
    }
    
    const testData = await testResponse.json();
    console.log('✅ API call successful!');
    console.log(`   Response: "${testData.response}"`);
    
    console.log('\n🎉 Ollama is working perfectly!');
    console.log('   Your calendar assistant should now use Ollama as a fallback.');
    
  } catch (error) {
    console.log('❌ Ollama test failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 This looks like a connection issue. Try:');
      console.log('   1. Make sure Ollama is running: ollama serve');
      console.log('   2. Check if the service is on port 11434');
      console.log('   3. Try restarting Ollama');
    }
  }
}

testOllama();
