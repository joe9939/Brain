// Package.json Tests — 包配置验证
// RED: package.json 缺少 main/exports/正确脚本
// GREEN: 完善 package.json

import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('C:/Users/86189/Desktop/brain-agent/brain-engine/package.json', 'utf8'));

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function testPackageName() {
  console.log('\n📦 Package Identity');
  assert(pkg.name === 'brain-engine', 'package name is brain-engine');
  assert(typeof pkg.version === 'string', 'version is string');
  assert(pkg.type === 'module', 'type is module (ESM)');
}

function testEntryPoints() {
  console.log('\n🚪 Entry Points');
  assert(typeof pkg.main === 'string' || pkg.exports !== undefined, 'has main or exports entry');
  if (pkg.main) assert(pkg.main === 'dist/index.js' || pkg.main.endsWith('index.js'), 'main points to dist/index.js');
  if (pkg.exports) {
    const exp = pkg.exports['.'] || pkg.exports;
    assert(!!exp, 'default export exists');
  }
}

function testTypeDeclarations() {
  console.log('\n📄 Type Declarations');
  assert(typeof pkg.types === 'string' || (pkg.exports?.['.']?.types !== undefined) || (pkg.exports?.['.']?.import?.types !== undefined), 'has types entry for TypeScript');
  assert(pkg.types?.endsWith('.d.ts') || pkg.exports?.['.']?.types?.endsWith('.d.ts'), 'types points to .d.ts file');
}

function testFilesField() {
  console.log('\n📁 Files Field');
  const hasFiles = Array.isArray(pkg.files);
  assert(hasFiles, 'files field is array');
  if (hasFiles) assert(pkg.files.includes('dist'), 'files includes dist/');
}

function testScripts() {
  console.log('\n⚙️ Scripts');
  assert(typeof pkg.scripts?.build === 'string', 'build script exists');
  assert(pkg.scripts?.build === 'tsc', 'build script is tsc');
  assert(typeof pkg.scripts?.prepublishOnly === 'string', 'prepublishOnly script exists');
}

function testMetadata() {
  console.log('\n🏷️ Metadata');
  assert(typeof pkg.description === 'string' && pkg.description.length > 0, 'has description');
  assert(typeof pkg.license === 'string', 'has license');
  assert(Array.isArray(pkg.keywords), 'has keywords array');
}

// ─── RUN ───
console.log('🧠 PACKAGE.JSON CONFIG TESTS');
console.log('='.repeat(50));

testPackageName();
testEntryPoints();
testTypeDeclarations();
testFilesField();
testScripts();
testMetadata();

console.log(`\n${'='.repeat(50)}`);
console.log(`Package: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All package config tests passed! ✅');
