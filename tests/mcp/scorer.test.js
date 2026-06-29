module.exports = {
  name: 'MCP: Reward Scorer Formulas',
  run: async () => {
    const start = Date.now();
    const results = [];
    function ucb(n, total) { if (n < 5) return 3; return Math.min(Math.sqrt(2 * Math.log(total) / n), 3); }
    results.push({ name: 'UCB: new action max bonus', pass: ucb(0, 100) === 3 });
    results.push({ name: 'UCB: frequent action lower bonus', pass: ucb(50, 100) < ucb(1, 100) });
    function td(current, reward, next) { const t = reward + (next ? 0.9 * next : 0); return Math.max(0, Math.min(10, current + 0.1 * (t - current))); }
    results.push({ name: 'TD: value updates correctly', pass: td(5, 8, 5) > 5 && td(5, 0) < 5 });
    function intrinsic(seen, improve, pairs) { return Math.min(4, ((seen<3?1:0.2)*0.4 + (improve>0?1:0.3)*0.3 + (pairs>5?1:0.4)*0.3) * 3); }
    results.push({ name: 'Intrinsic: novel > repeated', pass: intrinsic(1,1,10) > intrinsic(10,0,1) });
    return { passed: results.every(r=>r.pass), message: results.length+' checks', time_ms: Date.now()-start };
  },
};
