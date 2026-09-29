// Demo 1: to-do list
function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;

  const li = document.createElement('li');
  li.textContent = text; // safe, even if someone types HTML-looking text
  li.addEventListener('click', () => li.remove());

  document.getElementById('todo-list').append(li);
  input.value = '';
}

// Demo 2: static vs live collections
function addItemAndCompare() {
  const staticList = document.querySelectorAll('.item'); // snapshot taken now
  const liveList = document.getElementsByClassName('item'); // live reference

  const section2 = document.querySelectorAll('section')[1];
  const sectionButton = section2.querySelector('button');

  const newItem = document.createElement('div');
  newItem.className = 'item';
  newItem.textContent = 'item 4 (added afterward)';
  section2.insertBefore(newItem, sectionButton);

  // staticList was captured BEFORE the new item was added, so it won't include it
  document.getElementById('output-static').textContent = staticList.length;
  // liveList is read AFTER, and updates automatically, so it does include it
  document.getElementById('output-live').textContent = liveList.length;
}

// Demo 3: textContent escapes, innerHTML parses real markup
function showEscaping() {
  const raw = '<b>bold?</b>';
  document.getElementById('via-text').textContent = raw; // shown as literal text
  document.getElementById('via-html').innerHTML = raw; // rendered as actual bold
}
