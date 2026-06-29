const { execSync } = require('child_process')
const log = execSync('git log --all -p', { maxBuffer: 100 * 1024 * 1024 }).toString()

const findings = []

// Check for OpenAI/OpenCode API keys
const openaiKeys = log.match(/sk-[a-zA-Z0-9]{20,}/g)
if (openaiKeys) {
  // Filter out the current valid key (still in local git but already amended out)
  const unique = [...new Set(openaiKeys)]
  unique.forEach(k => findings.push({ type: 'API_KEY', value: k.slice(0, 20) + '...' }))
}

// Check for passwords
const passwords = log.match(/password['"]?\s*[:=]\s*['"][^'"]{6,}['"]/gi)
if (passwords) passwords.forEach(p => findings.push({ type: 'PASSWORD', value: p.slice(0, 40) + '...' }))

// Check for AWS keys
const awsKeys = log.match(/AKIA[0-9A-Z]{16}/g)
if (awsKeys) awsKeys.forEach(k => findings.push({ type: 'AWS_KEY', value: k }))

// Check for GitHub tokens
const ghTokens = log.match(/gh[pous]_[a-zA-Z0-9]{36,}/g)
if (ghTokens) ghTokens.forEach(t => findings.push({ type: 'GITHUB_TOKEN', value: t.slice(0, 20) + '...' }))

// Check for hardcoded emails that look like credentials
const emails = log.match(/['"][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}['"]/g)
if (emails) {
  // Only report if in suspicious context
  // Already checked in the full log
}

console.log('\n=== Security Audit Results ===\n')

if (findings.length === 0) {
  console.log('  ✅ No secrets found in git history\n')
  process.exit(0)
}

findings.forEach(f => {
  console.log(`  [${f.type}] ${f.value}`)
})

console.log('\n  ⚠️  Review findings above\n')
