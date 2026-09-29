// Demo 1: localStorage basics, and the object-without-stringify bug
function setLS() {
  localStorage.setItem('demoKey', document.getElementById('ls-value').value);
  document.getElementById('ls-log').textContent = 'stored.';
}
function getLS() {
  document.getElementById('ls-log').textContent =
    'getItem: ' + localStorage.getItem('demoKey');
}
function removeLS() {
  localStorage.removeItem('demoKey');
  document.getElementById('ls-log').textContent =
    'removed. getItem now: ' + localStorage.getItem('demoKey');
}

function storeObjectWrong() {
  const user = { name: 'Ada', role: 'admin' };
  localStorage.setItem('userWrong', user); // no JSON.stringify, the bug
  document.getElementById('ls-log').textContent =
    'stored without stringify, read back as: ' +
    localStorage.getItem('userWrong');
}
function storeObjectRight() {
  const user = { name: 'Ada', role: 'admin' };
  localStorage.setItem('userRight', JSON.stringify(user));
  const parsed = JSON.parse(localStorage.getItem('userRight'));
  document.getElementById('ls-log').textContent =
    'stored with stringify, read back and parsed as: ' +
    JSON.stringify(parsed) +
    ' (parsed.name = ' +
    parsed.name +
    ')';
}

// Demo 2: sessionStorage, identical API
function setSS() {
  sessionStorage.setItem('demoKey', document.getElementById('ss-value').value);
  document.getElementById('ss-log').textContent =
    'stored in sessionStorage (this tab only).';
}
function getSS() {
  document.getElementById('ss-log').textContent =
    'getItem: ' + sessionStorage.getItem('demoKey');
}

// Demo 3: cookies via document.cookie
function setCookie() {
  const name = document.getElementById('cookie-name').value;
  const value = document.getElementById('cookie-value').value;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=3600; path=/`;
  document.getElementById('cookie-log').textContent = `cookie "${name}" set.`;
}
function readCookies() {
  document.getElementById('cookie-log').textContent =
    'raw document.cookie: ' + document.cookie;
}
function readOneCookie() {
  const name = document.getElementById('cookie-name').value;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='));
  const value = match ? decodeURIComponent(match.split('=')[1]) : null;
  document.getElementById('cookie-log').textContent =
    `parsed "${name}": ` + value;
}

// Demo 4: storage event, simulated since it needs a second real tab to fire naturally
window.addEventListener('storage', event => {
  document.getElementById('storage-event-log').textContent =
    `storage event received, key: ${event.key}, oldValue: ${event.oldValue}, newValue: ${event.newValue}`;
});
function simulateStorageEvent() {
  const event = new StorageEvent('storage', {
    key: 'demoKey',
    oldValue: 'old-value-from-another-tab',
    newValue: 'new-value-from-another-tab',
    storageArea: localStorage,
  });
  window.dispatchEvent(event);
}
