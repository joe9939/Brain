(async ()=>{
var t = require('./tests/plugin/emotion-propagation.test.js');
var r = await t.run();
console.log('emotion-propagation:', JSON.stringify(r));
t = require('./tests/plugin/signal-cross-products.test.js');
r = await t.run();
console.log('signal-cross-products:', JSON.stringify(r));
t = require('./tests/plugin/swarm-edges.test.js');
r = await t.run();
console.log('swarm-edges:', JSON.stringify(r));
})();
