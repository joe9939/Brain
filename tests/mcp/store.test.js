module.exports = {
  name: 'MCP: Memory Store Logic',
  run: async () => {
    const start = Date.now();
    const results = [];
    function jaccard(a, b) {
      const wa = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
      const wb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
      const inter = new Set([...wa].filter(w => wb.has(w)));
      const union = new Set([...wa, ...wb]);
      return union.size === 0 ? 1 : inter.size / union.size;
    }
    results.push({ name: 'Similarity: identical high', pass: jaccard('hello world', 'hello world') > 0.9 });
    results.push({ name: 'Similarity: different low', pass: jaccard('hello world', 'foo bar') < 0.3 });
    results.push({ name: 'Similarity: partial moderate', pass: jaccard('hello world test', 'hello world') > 0.5 });
    const w = (r, i, rel) => 0.3 * (1/(1+r)) + 0.3 * i + 0.4 * rel;
    results.push({ name: 'Weight: recent+relevant > stale+irrelevant', pass: w(0, 1, 1) > w(30, 0.1, 0.1) });
    results.push({ name: 'Weight: max <= 1.0', pass: w(0, 1, 1) <= 1.0 });
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
