// A tiny local server (built-in http module only, no dependencies) so the
// Fetch API demo has a real backend to talk to. Run this first:
//
//   node 22-fetch-api-server.js
//
// then open 22-fetch-api.html in a browser while it's running.

const http = require('http');

let todos = [
  { id: 1, title: 'Learn the Fetch API', completed: false },
  { id: 2, title: 'Build a small project', completed: false },
];
let nextId = 3;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // keep this simple to open as a plain file
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/api/todos') {
    res.writeHead(200);
    res.end(JSON.stringify(todos));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/todos/999') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Todo 999 not found' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/slow') {
    setTimeout(() => {
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'finally responded after 3s' }));
    }, 3000);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/todos') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const parsed = JSON.parse(body);
      const newTodo = { id: nextId++, title: parsed.title, completed: false };
      todos.push(newTodo);
      res.writeHead(201);
      res.end(JSON.stringify(newTodo));
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 5050;
server.listen(PORT, () => {
  console.log(`Fetch API demo server running at http://localhost:${PORT}`);
});
