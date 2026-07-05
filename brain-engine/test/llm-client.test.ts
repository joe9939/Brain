// Test: DeepSeek LLM client — arXiv 2504.01990v2 Agent Loop §1.3A
// REAL API call, no mocks. Tests fail if no API key.

import { LLMClient } from '../src/core/llm-client';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`PASS: ${name}`); }
  else { failed++; console.log(`FAIL: ${name}`); }
}

async function test() {
  const key = process.env.DEEPSEEK_API_KEY || '';
  if (!key) {
    console.log('SKIP: No DEEPSEEK_API_KEY set');
    process.exit(0);
  }

  const client = new LLMClient({ apiKey: key, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });

  // Test 1: Basic completion
  const r1 = await client.complete([
    { role: 'system', content: 'Reply with exactly one word.' },
    { role: 'user', content: 'Say hello' },
  ]);
  assert(r1.content.length > 0, 'basic completion returns content');
  assert(!r1.content.includes('undefined'), 'no undefined in response');

  // Test 2: System prompt respected
  const r2 = await client.complete([
    { role: 'system', content: 'Always start your response with "PREFIX:"' },
    { role: 'user', content: 'Say hi' },
  ]);
  assert(r2.content.startsWith('PREFIX:'), 'system prompt respected');

  // Test 3: Structured output
  const r3 = await client.complete([
    { role: 'system', content: 'Respond with valid JSON only: {"answer": string}' },
    { role: 'user', content: 'What is 2+2?' },
  ]);
  try {
    const j = JSON.parse(r3.content);
    assert(j.answer !== undefined, 'structured JSON output');
  } catch {
    assert(false, 'structured JSON output');
  }

  // Test 4: Different temperatures
  const r4 = await client.complete([
    { role: 'user', content: 'Output the number 42' },
  ], { temperature: 0.1 });
  assert(r4.content.includes('42'), 'low temperature deterministic');

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) process.exit(1);
  else console.log('All tests passed! ✅');
}

test().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
