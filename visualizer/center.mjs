const regions = [
  {id:'world-cortex',x:0,y:-3.2,z:-0.5},{id:'attention',x:1.5,y:-2.5,z:0.5},
  {id:'amygdala',x:-1.5,y:-1.5,z:1.8},{id:'hippocampus',x:1.5,y:-1,z:2.2},
  {id:'insula',x:0,y:-1.8,z:2.5},{id:'thalamus',x:0,y:-0.8,z:1},
  {id:'basal-ganglia',x:-1,y:-0.5,z:1.5},{id:'hypothalamus',x:0.5,y:0.2,z:1.2},
  {id:'reward',x:1.5,y:-0.2,z:0.5},{id:'cerebellum',x:0,y:0.8,z:2.8},
  {id:'dmn',x:-1.5,y:0.5,z:1},{id:'safety',x:1.2,y:0.5,z:2},
  {id:'self-optimizer',x:-1.5,y:1.2,z:-0.5},{id:'offline-consol',x:0,y:1.5,z:0},
  {id:'self-enhance',x:1.5,y:1.2,z:-0.5},{id:'swarm-planner',x:-1.2,y:2.5,z:0.5},
  {id:'swarm-coder',x:0,y:2.8,z:-0.8},{id:'swarm-reviewer',x:1.2,y:2.5,z:0.5},
  {id:'swarm-tester',x:0,y:3,z:0.8},{id:'brain',x:0,y:3.8,z:0},
];
const cx = regions.reduce((s,r)=>s+r.x,0)/regions.length;
const cy = regions.reduce((s,r)=>s+r.y,0)/regions.length;
const cz = regions.reduce((s,r)=>s+r.z,0)/regions.length;
console.log(`Center: ${cx.toFixed(2)}, ${cy.toFixed(2)}, ${cz.toFixed(2)}`);

let best = null, min = Infinity;
regions.forEach(r => {
  const d = Math.hypot(r.x-cx, r.y-cy, r.z-cz);
  if (d < min) { min = d; best = r; }
});
console.log(`Closest: ${best.id} at (${best.x}, ${best.y}, ${best.z}), dist=${min.toFixed(2)}`);
