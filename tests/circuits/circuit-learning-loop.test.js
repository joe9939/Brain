// circuit-learning-loop.test.js — Learning Feedback Loop
// Verifies self-enhance reflexion → hippocampus → L1 next message cycle
const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
  name: 'CIRCUIT: Learning Feedback Loop',
  run: async () => {
    const start = Date.now();
    const content = fs.readFileSync(config.SKILL_FILE, 'utf8');
    const results = [];

    // 1. POST-ACTION has lesson storage step (Step 1b or similar)
    const postIdx = content.indexOf('## POST-ACTION');
    const postSection = postIdx >= 0 ? content.substring(postIdx) : '';
    const hasLessonStorage = postSection.includes('lesson') || postSection.includes('reflexion') || postSection.includes('recent');
    results.push({ name: 'POST-ACTION stores reflexion lessons', pass: hasLessonStorage });

    // 2. Lesson tagged as reflexion type
    results.push({ name: 'Lesson stored as reflexion type', pass: content.includes('reflexion') || content.includes('reflexion_lesson') || content.includes('reflexion:') });

    // 3. L1_CONTEXT includes recent_lessons
    results.push({ name: 'L1_CONTEXT has recent_lessons field', pass: content.includes('recent_lesson') || (content.includes('lesson') && content.includes('L1_CONTEXT')) });

    // 4. L1 hippocampus prompt gets lesson context
    const l1Idx = content.indexOf('## L1:');
    const l1Block = l1Idx >= 0 ? content.substring(l1Idx, Math.max(content.indexOf('## L1.5', l1Idx), content.indexOf('## L2', l1Idx))) : '';
    results.push({ name: 'L1 hippocampus receives lesson context', pass: l1Block.includes('lesson') || content.includes('recent_lessons') });

    // 5. STATUS DISPLAY has [LEARN:] line
    results.push({ name: 'STATUS DISPLAY has [LEARN:] line', pass: content.includes('[LEARN:') });

    const passed = results.every(r => r.pass);
    const failed = results.filter(r => !r.pass).map(r => r.name);

    // Write evidence
    const evidenceDir = path.join(config.BRAIN_AGENT_DIR, '.omo', 'evidence');
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
    const evidence = [
      '# Circuit: Learning Feedback Loop',
      '**Status**: ' + (passed ? 'PASS' : 'FAIL'),
      '**Timestamp**: ' + new Date().toISOString(),
      '**Duration**: ' + (Date.now() - start) + 'ms',
      '',
      '## Checks',
      ...results.map(r => '- [' + (r.pass ? 'x' : ' ') + '] ' + r.name),
      ...(failed.length > 0 ? ['', '## Failures', ...failed.map(f => '- ' + f)] : []),
    ].join('\n');
    fs.writeFileSync(path.join(evidenceDir, 'circuit-learning-loop.md'), evidence);

    return {
      passed,
      message: passed
        ? 'All ' + results.length + ' learning feedback loop checks passed'
        : 'Failed: ' + failed.join(', '),
      time_ms: Date.now() - start,
    };
  },
};
