const BASE = 'http://localhost:5050';

// Demo 1: basic GET, then reading the body with .json()
async function loadTodos() {
  const log = document.getElementById('log-basic');
  log.textContent = 'loading...';
  try {
    const response = await fetch(`${BASE}/api/todos`);
    const todos = await response.json(); // reads the body, can only be done once
    log.textContent = JSON.stringify(todos, null, 2);
  } catch (err) {
    log.textContent = 'network error: ' + err.message;
  }
}

// Demo 2: the response.ok gotcha, fetch does NOT reject on a 404
async function loadMissingTodo() {
  const log = document.getElementById('log-404');
  try {
    const response = await fetch(`${BASE}/api/todos/999`);
    log.textContent = `fetch did not reject. response.ok: ${response.ok}, response.status: ${response.status}\n`;
    if (!response.ok) {
      const errorBody = await response.json();
      log.textContent += `handled manually: ${errorBody.error}`;
    }
  } catch (err) {
    log.textContent =
      'this catch block should not run for a 404: ' + err.message;
  }
}

// Demo 3: POST with headers and a JSON body
async function addTodo() {
  const log = document.getElementById('log-post');
  const title = document.getElementById('todo-title').value || 'Untitled';
  try {
    const response = await fetch(`${BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }), // body must be a string, not a plain object
    });
    const created = await response.json();
    log.textContent = `created: ${JSON.stringify(created)}`;
  } catch (err) {
    log.textContent = 'network error: ' + err.message;
  }
}

// Demo 4: AbortController, cancelling a slow request
let currentController = null;
async function startSlowRequest() {
  const log = document.getElementById('log-abort');
  currentController = new AbortController();
  log.textContent = 'request started, waiting 3s (click Cancel to abort)...';
  try {
    const response = await fetch(`${BASE}/api/slow`, {
      signal: currentController.signal,
    });
    const data = await response.json();
    log.textContent = 'completed: ' + JSON.stringify(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      log.textContent = 'request was cancelled via AbortController';
    } else {
      log.textContent = 'network error: ' + err.message;
    }
  }
}
function cancelSlowRequest() {
  if (currentController) currentController.abort();
}
