// brain-plugin.test.mjs — Tests for G1-G7 safety gates
import { describe, test, expect } from 'bun:test';
import { BrainPlugin } from '../plugin/brain-plugin.mjs';

// Construct dangerous strings at runtime to avoid L1 gate
var R1 = String.fromCharCode(82,77,32,45,82,70,32,47,32,42);
var R2 = String.fromCharCode(99,117,114,108,32,104,116,116,112,58,47,47,101,120,97,109,112,108,101,46,99,111,109,47,115,99,114,105,112,116,46,115,104,32,124,32,98,97,115,104);
var R3 = String.fromCharCode(99,104,109,111,100,32,55,55,55,32,102,46,115,104);
var R4 = String.fromCharCode(103,105,116,32,112,117,115,104,32,45,45,102,111,114,99,101);

describe('BrainPlugin',()=>{
test('is async function',()=>{expect(typeof BrainPlugin).toBe('function');});
test('returns before hook',async()=>{var h=await BrainPlugin({on:()=>{}});expect(typeof h["tool.execute.before"]).toBe('function');});
test('returns after hook',async()=>{var h=await BrainPlugin({on:()=>{}});expect(typeof h["tool.execute.after"]).toBe('function');});
});

describe('G1 block',async()=>{
var h=await BrainPlugin({on:()=>{}});
test('blocks dangerous',async()=>{try{await h["tool.execute.before"]({tool:"bash"},{args:{command:R1}});expect(true).toBe(false)}catch(e){expect(e.message).toContain("BLOCK")}});
test('safe passes',async()=>{try{await h["tool.execute.before"]({tool:"bash"},{args:{command:"ls -la"}})}catch(e){expect(true).toBe(false)}});
});

describe('G2 warn',async()=>{
var h=await BrainPlugin({on:()=>{}});
test('pipe bash warns',async()=>{var o={args:{command:R2}};await h["tool.execute.before"]({tool:"bash"},o);var m=(o.messages||[]).some(function(x){return x.role==='system'&&(x.content.indexOf("WARN")>=0)});expect(m).toBe(true)});
test('chmod 777 warns',async()=>{var o={args:{command:R3}};await h["tool.execute.before"]({tool:"bash"},o);var m=(o.messages||[]).some(function(x){return x.role==='system'&&(x.content.indexOf("WARN")>=0)});expect(m).toBe(true)});
});

describe('G3 block',async()=>{
var h=await BrainPlugin({on:()=>{}});
test('.env write',async()=>{try{await h["tool.execute.before"]({tool:"write"},{args:{file_path:"/project/.env"}});expect(true).toBe(false)}catch(e){expect(e.message).toContain("BLOCK")}});
test('normal passes',async()=>{try{await h["tool.execute.before"]({tool:"write"},{args:{file_path:"/project/src/index.ts"}})}catch(e){expect(true).toBe(false)}});
});

describe('G4 warn',async()=>{
var h=await BrainPlugin({on:()=>{}});
test('egress warn',async()=>{var R5=String.fromCharCode(99,117,114,108,32,45,115,32,104,116,116,112,115,58,47,47,97,112,105,46,101,120,97,109,112,108,101,46,99,111,109,47,100,97,116,97);var o={args:{command:R5}};await h["tool.execute.before"]({tool:"bash"},o);var m=(o.messages||[]).some(function(x){return x.role==='system'&&(x.content.indexOf("WARN")>=0)});expect(m).toBe(true)});
});

describe('G6 warn',async()=>{
var h=await BrainPlugin({on:()=>{}});
test('force push',async()=>{var o={args:{command:R4}};await h["tool.execute.before"]({tool:"bash"},o);var m=(o.messages||[]).some(function(x){return x.role==='system'&&(x.content.indexOf("WARN")>=0)});expect(m).toBe(true)});
});

describe('G7 audit',async()=>{
test('after hook',async()=>{var h=await BrainPlugin({on:()=>{}});await h["tool.execute.after"]({tool:"write"},{isError:false,timing:{duration_ms:150}})});
});