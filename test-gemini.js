const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('❌ GOOGLE_API_KEY not set');
  process.exit(1);
}

console.log('✓ API Key found');

const client = new GoogleGenerativeAI(apiKey);
const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function testSimple() {
  console.log('\n=== Test 1: Simple JSON ===');
  try {
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Return {"answer": "hello", "value": 42}' }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['answer', 'value'],
        },
      },
    });

    const text = response.response.text();
    console.log('✓ Response received');
    console.log('Raw:', text);
    const parsed = JSON.parse(text);
    console.log('✓ Parsed:', parsed);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function testComplex() {
  console.log('\n=== Test 2: Complex Schema ===');
  try {
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Create a simple learning plan with 1 step. Return: {"goalSummary": "...", "steps": [{"order": 1, "title": "...", "description": "..."}]}',
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            goalSummary: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  order: { type: 'number' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                },
                required: ['order', 'title', 'description'],
              },
            },
          },
          required: ['goalSummary', 'steps'],
        },
      },
    });

    const text = response.response.text();
    console.log('✓ Response received');
    const parsed = JSON.parse(text);
    console.log('✓ Parsed:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

(async () => {
  await testSimple();
  await testComplex();
  console.log('\n✓ All tests completed');
  process.exit(0);
})();
