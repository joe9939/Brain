import http from 'http';
http.get('http://localhost:3456/', (res) => {
  console.log('SERVER IS UP on port 3456');
  res.resume();
}).on('error', (e) => {
  console.log('SERVER IS DOWN:', e.message);
});
