import { BrainEngine } from './src/index.ts';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const brain = new BrainEngine({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
});

console.log('=== Test 1: Simple query ===');
const r1 = await brain.process('What is the capital of France?');
console.log('Output:', r1.output);
console.log('Winner signal:', r1.gate.winningSignal);
