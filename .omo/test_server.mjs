const BASE = 'http://127.0.0.1:14104';
const AUTH = 'Basic ' + Buffer.from('opencode:88888').toString('base64');
const HEADERS = { Authorization: AUTH, 'Content-Type': 'application/json', 'x-opencode-directory': 'C:/Users/86189/Desktop/brain-agent' };

async function main() {
  // Create session
  const sessRes = await fetch(BASE + '/session', { method: 'POST', headers: HEADERS, body: JSON.stringify({ agent: 'build' }) });
  const sess = await sessRes.json();
  console.log('SESSION:', sess.id);

  // Send message
  const msgRes = await fetch(BASE + '/session/' + sess.id + '/message', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ parts: [{ type: 'text', text: 'say hello back in one word' }], model: { providerID: 'opencode-go', modelID: 'deepseek-v4-flash' } })
  });
  const text = await msgRes.text();
  console.log('STATUS:', msgRes.status);
  console.log('RESPONSE:', text.slice(0, 500));
}
main().catch(e => console.error('ERROR:', e.message));
