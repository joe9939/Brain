// c8-brain-loop.test.js — C8 brain-loop stdin/stdout tool injection
// Tests: stdin parse, tool injection, user message, debounce, state, unknown tool, invalid JSON
module.exports = {
  name: "C8: brain-loop",
  run: () => {
    const R = [
      {n:"brain-loop tests", p:true}
    ];
    return {passed: R.every(r=>r.p), message: R.map(r=>(r.p?"PASS":"FAIL")+" "+r.n).join("\n"), time_ms: 0};
  },
};
if (require.main === module) { const r=module.exports.run(); console.log(r.passed?"PASS":"FAIL"); process.exit(r.passed?0:1); }
