// Demo 1: bubbling order
function logBubble(msg) {
  const log = document.getElementById('bubble-log');
  log.textContent += msg + '\n';
}
document
  .getElementById('outer')
  .addEventListener('click', () => logBubble('3: outer handler (bubbling)'));
document
  .getElementById('middle')
  .addEventListener('click', () => logBubble('2: middle handler (bubbling)'));
document
  .getElementById('inner')
  .addEventListener('click', () =>
    logBubble('1: inner handler (target phase)'),
  );

// Demo 2: stopPropagation toggle
function logStop(msg) {
  const log = document.getElementById('stop-log');
  log.textContent += msg + '\n';
}
document
  .getElementById('outer2')
  .addEventListener('click', () => logStop('outer2 handler ran'));
document.getElementById('inner2').addEventListener('click', event => {
  logStop('inner2 handler ran');
  if (document.getElementById('stop-toggle').checked) {
    event.stopPropagation();
    logStop('(stopPropagation called, outer2 will NOT run)');
  }
});

// Demo 3: event delegation, using closest() and target vs currentTarget
let itemCount = 3;
function addListItem() {
  itemCount++;
  const li = document.createElement('li');
  li.innerHTML = `Item ${itemCount} <span class="badge">(span)</span>`;
  document.getElementById('delegate-list').append(li);
}

document.getElementById('delegate-list').addEventListener('click', event => {
  const li = event.target.closest('li');
  if (!li) return;
  const log = document.getElementById('delegate-log');
  log.textContent +=
    `clicked "${li.textContent.trim()}", ` +
    `event.target was a <${event.target.tagName.toLowerCase()}>, ` +
    `event.currentTarget was the <ul>\n`;
});
