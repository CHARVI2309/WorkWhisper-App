/**
 * Work Whisper — Dashboard App
 * Features: delete confirm, strikethrough, scroll, search, due date, priority, drag-to-reorder
 */

const session = Auth.requireAuth();

const state = {
  todos: [],
  filter: 'all',
  priorityFilter: null,
  search: '',
  sort: 'order',
  dragSrcId: null,
};

function getStorageKey() { return Auth.getTodosKey(session.userId); }

// ===== DOM =====
const form             = document.getElementById('todo-form');
const input            = document.getElementById('todo-input');
const charCount        = document.getElementById('char-count');
const dueInput         = document.getElementById('todo-due');
const prioritySelect   = document.getElementById('todo-priority');
const todoList         = document.getElementById('todo-list');
const emptyState       = document.getElementById('empty-state');
const todoFooter       = document.getElementById('todo-footer');
const itemsLeft        = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed');
const toastContainer   = document.getElementById('toast-container');
const searchInput      = document.getElementById('search-input');
const sortSelect       = document.getElementById('sort-select');
const userAvatar       = document.getElementById('user-avatar');
const userName         = document.getElementById('user-name');
const userEmail        = document.getElementById('user-email');
const logoutBtn        = document.getElementById('logout-btn');
const sidebarToggle    = document.getElementById('sidebar-toggle');
const sidebar          = document.getElementById('sidebar');
const sidebarOverlay   = document.getElementById('sidebar-overlay');
const navItems         = document.querySelectorAll('.sidebar-nav-item[data-filter]');
const priorityItems    = document.querySelectorAll('.sidebar-nav-item[data-priority]');
const statTotal        = document.getElementById('stat-total');
const statActive       = document.getElementById('stat-active');
const statDone         = document.getElementById('stat-done');
const badgeAll         = document.getElementById('badge-all');
const badgeActive      = document.getElementById('badge-active');
const badgeCompleted   = document.getElementById('badge-completed');
const sidebarProgress  = document.getElementById('sidebar-progress');
const progressBarFill  = document.getElementById('progress-bar-fill');
const progressLabelDone = document.getElementById('progress-label-done');
const progressLabelPct  = document.getElementById('progress-label-pct');
const topbarTitle      = document.getElementById('topbar-title');
const topbarSubtitle   = document.getElementById('topbar-subtitle');
const modalBackdrop    = document.getElementById('modal-backdrop');
const modalBody        = document.getElementById('modal-body');
const modalConfirm     = document.getElementById('modal-confirm');
const modalCancel      = document.getElementById('modal-cancel');

// ===== Utilities =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatCreated(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDue(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isDueOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(dateStr + 'T00:00:00') < today;
}

function isDueSoon(dateStr) {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = (due - today) / 86400000;
  return diff >= 0 && diff <= 2;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function saveTodos() {
  localStorage.setItem(getStorageKey(), JSON.stringify(state.todos));
}

function loadTodos() {
  try {
    const stored = localStorage.getItem(getStorageKey());
    state.todos = stored ? JSON.parse(stored) : [];
  } catch {
    state.todos = [];
    showToast('Could not load saved tasks', 'error');
  }
}

function setupUserBar() {
  userName.textContent = session.name;
  userEmail.textContent = session.email;
  userAvatar.textContent = session.name.charAt(0).toUpperCase();
}

// ===== Delete Confirmation Modal =====
let pendingDeleteId = null;

function confirmDelete(id, taskText) {
  pendingDeleteId = id;
  modalBody.textContent = `"${taskText}" will be permanently removed.`;
  modalBackdrop.classList.add('open');
  modalBackdrop.setAttribute('aria-hidden', 'false');
  modalConfirm.focus();
}

function closeModal() {
  pendingDeleteId = null;
  modalBackdrop.classList.remove('open');
  modalBackdrop.setAttribute('aria-hidden', 'true');
}

modalConfirm.addEventListener('click', () => {
  if (pendingDeleteId) {
    executeDelete(pendingDeleteId);
    closeModal();
  }
});

modalCancel.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

// ===== Todo Operations =====
function addTodo(text, dueDate, priority) {
  const trimmed = text.trim();
  if (!trimmed) { showToast('Please enter a task', 'error'); input.focus(); return; }
  if (state.todos.some((t) => t.text.toLowerCase() === trimmed.toLowerCase())) {
    showToast('This task already exists', 'error'); return;
  }
  state.todos.unshift({
    id: generateId(),
    text: trimmed,
    completed: false,
    createdAt: new Date().toISOString(),
    dueDate: dueDate || null,
    priority: priority || 'none',
    order: state.todos.length > 0 ? state.todos[0].order - 1 : 0,
  });
  saveTodos();
  input.value = '';
  dueInput.value = '';
  prioritySelect.value = 'none';
  updateCharCount();
  render();
  showToast('Task added');
}

function toggleTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    render();
    showToast(todo.completed ? 'Task completed' : 'Task marked active');
    // Check if ALL tasks are now done
    if (todo.completed && state.todos.length > 0 && state.todos.every((t) => t.completed)) {
      showAllDoneBanner();
    }
  }
}

function executeDelete(id) {
  const item = todoList.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
    setTimeout(() => {
      state.todos = state.todos.filter((t) => t.id !== id);
      saveTodos(); render();
      showToast('Task deleted');
    }, 250);
  } else {
    state.todos = state.todos.filter((t) => t.id !== id);
    saveTodos(); render();
    showToast('Task deleted');
  }
}

function editTodo(id, newText) {
  const trimmed = newText.trim();
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;
  if (!trimmed) { showToast('Task cannot be empty', 'error'); render(); return; }
  if (state.todos.some((t) => t.id !== id && t.text.toLowerCase() === trimmed.toLowerCase())) {
    showToast('This task already exists', 'error'); render(); return;
  }
  todo.text = trimmed;
  saveTodos(); render();
  showToast('Task updated');
}

function clearCompleted() {
  const count = state.todos.filter((t) => t.completed).length;
  if (count === 0) return;
  state.todos = state.todos.filter((t) => !t.completed);
  saveTodos(); render();
  showToast(`${count} completed task${count > 1 ? 's' : ''} cleared`);
}

function setFilter(filter) {
  state.filter = filter;
  state.priorityFilter = null;
  priorityItems.forEach((i) => { i.classList.remove('active'); i.removeAttribute('aria-current'); });
  navItems.forEach((item) => {
    const isActive = item.dataset.filter === filter;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  const titles = {
    all: { title: 'All Tasks', subtitle: 'Manage and track your tasks' },
    active: { title: 'Active Tasks', subtitle: 'Tasks still in progress' },
    completed: { title: 'Completed Tasks', subtitle: 'Tasks you have finished' },
  };
  const t = titles[filter] || titles.all;
  topbarTitle.textContent = t.title;
  topbarSubtitle.textContent = t.subtitle;
  render();
}

function setPriorityFilter(p) {
  state.priorityFilter = p;
  state.filter = 'all';
  navItems.forEach((i) => { i.classList.remove('active'); i.removeAttribute('aria-current'); });
  priorityItems.forEach((item) => {
    const isActive = item.dataset.priority === p;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  topbarTitle.textContent = `${p.charAt(0).toUpperCase() + p.slice(1)} Priority`;
  topbarSubtitle.textContent = `Showing ${p} priority tasks`;
  render();
}

function getFilteredTodos() {
  let filtered = [...state.todos];
  
  // Filter by status
  if (state.filter === 'active') filtered = filtered.filter((t) => !t.completed);
  else if (state.filter === 'completed') filtered = filtered.filter((t) => t.completed);
  
  // Filter by priority
  if (state.priorityFilter) filtered = filtered.filter((t) => t.priority === state.priorityFilter);
  
  // Search
  if (state.search) {
    const q = state.search.toLowerCase();
    filtered = filtered.filter((t) => t.text.toLowerCase().includes(q));
  }
  
  // Sort
  if (state.sort === 'created') {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (state.sort === 'due') {
    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (state.sort === 'priority') {
    const pmap = { high: 3, medium: 2, low: 1, none: 0 };
    filtered.sort((a, b) => pmap[b.priority] - pmap[a.priority]);
  } else {
    // custom order
    filtered.sort((a, b) => b.order - a.order);
  }
  
  return filtered;
}

// ===== Drag to reorder =====
function handleDragStart(e, id) {
  state.dragSrcId = id;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  e.target.closest('.todo-item')?.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.target.closest('.todo-item')?.classList.remove('drag-over');
}

function handleDrop(e, targetId) {
  if (e.stopPropagation) e.stopPropagation();
  e.target.closest('.todo-item')?.classList.remove('drag-over');
  if (state.dragSrcId && state.dragSrcId !== targetId) {
    const srcIdx = state.todos.findIndex((t) => t.id === state.dragSrcId);
    const tgtIdx = state.todos.findIndex((t) => t.id === targetId);
    if (srcIdx !== -1 && tgtIdx !== -1) {
      const [src] = state.todos.splice(srcIdx, 1);
      state.todos.splice(tgtIdx, 0, src);
      // Recalc order
      state.todos.forEach((t, i) => { t.order = state.todos.length - i; });
      saveTodos();
      render();
      showToast('Task order updated');
    }
  }
  return false;
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.todo-item').forEach((el) => el.classList.remove('drag-over'));
}

// ===== All Tasks Done Banner =====
const DONE_MESSAGES = [
  '🎉 Outstanding work, {name}! Every task is done.',
  '🏆 You crushed it, {name}! All tasks complete.',
  '✨ Incredible, {name}! Your list is spotless.',
  '🚀 Mission accomplished, {name}! Zero tasks remaining.',
  '💪 You nailed it, {name}! Nothing left to do.',
];

function showAllDoneBanner() {
  const banner = document.getElementById('all-done-banner');
  const msg = DONE_MESSAGES[Math.floor(Math.random() * DONE_MESSAGES.length)]
    .replace('{name}', session.name.split(' ')[0]);
  banner.querySelector('.all-done-message').textContent = msg;
  banner.classList.add('visible');
  launchConfetti();
  // Auto-dismiss after 5 seconds
  setTimeout(() => dismissAllDoneBanner(), 5000);
}

function dismissAllDoneBanner() {
  document.getElementById('all-done-banner').classList.remove('visible');
}

function launchConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const colours = ['#7c3aed','#a78bfa','#34d399','#fbbf24','#f87171','#60a5fa','#f9a8d4'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colours[Math.floor(Math.random() * colours.length)]};
      width: ${Math.random() * 8 + 5}px;
      height: ${Math.random() * 8 + 5}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-delay: ${Math.random() * 0.8}s;
      animation-duration: ${Math.random() * 1.5 + 1.5}s;
    `;
    container.appendChild(piece);
  }
}

// ===== Rendering =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = `todo-item${todo.completed ? ' completed' : ''}`;
  if (todo.dueDate) {
    if (isDueOverdue(todo.dueDate)) li.classList.add('todo-item--overdue');
    else if (isDueSoon(todo.dueDate)) li.classList.add('todo-item--due-soon');
  }
  li.dataset.id = todo.id;
  li.draggable = true;
  
  const priorityClass = todo.priority && todo.priority !== 'none' ? ` priority-${todo.priority}` : '';
  const dueText = todo.dueDate ? `<span class="todo-due">${formatDue(todo.dueDate)}</span>` : '';
  
  li.innerHTML = `
    <span class="drag-handle" aria-label="Drag to reorder">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </span>
    <label class="todo-checkbox" aria-label="Mark as ${todo.completed ? 'incomplete' : 'complete'}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-hidden="true">
      <span class="checkbox-custom">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
    </label>
    <div class="todo-content${priorityClass}">
      <span class="todo-text" tabindex="0">${escapeHtml(todo.text)}</span>
      <div class="todo-meta">
        <span class="todo-created">${formatCreated(todo.createdAt)}</span>
        ${dueText}
      </div>
    </div>
    ${todo.priority && todo.priority !== 'none' ? `<span class="priority-badge priority-badge--${todo.priority}" title="${todo.priority} priority">${todo.priority}</span>` : ''}
    <div class="todo-actions">
      <button type="button" class="btn-icon edit" aria-label="Edit task" title="Edit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button type="button" class="btn-icon delete" aria-label="Delete task" title="Delete">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `;
  
  // Events
  li.querySelector('.todo-checkbox input').addEventListener('change', () => toggleTodo(todo.id));
  li.querySelector('.btn-icon.delete').addEventListener('click', () => confirmDelete(todo.id, todo.text));
  li.querySelector('.btn-icon.edit').addEventListener('click', () => startEditing(li, todo));
  const textEl = li.querySelector('.todo-text');
  textEl.addEventListener('dblclick', () => startEditing(li, todo));
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditing(li, todo); }
  });
  
  // Drag handlers
  li.addEventListener('dragstart', (e) => handleDragStart(e, todo.id));
  li.addEventListener('dragover', handleDragOver);
  li.addEventListener('dragenter', handleDragEnter);
  li.addEventListener('dragleave', handleDragLeave);
  li.addEventListener('drop', (e) => handleDrop(e, todo.id));
  li.addEventListener('dragend', handleDragEnd);
  
  return li;
}

function startEditing(li, todo) {
  const content = li.querySelector('.todo-content');
  content.innerHTML = `
    <input type="text" class="todo-edit-input" value="${escapeHtml(todo.text)}" maxlength="120" aria-label="Edit task">
  `;
  const editInput = content.querySelector('.todo-edit-input');
  editInput.focus(); editInput.select();
  
  function finishEdit() { editTodo(todo.id, editInput.value); }
  editInput.addEventListener('blur', finishEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); editInput.blur(); }
    if (e.key === 'Escape') render();
  });
}

function updateStats() {
  const total = state.todos.length;
  const done = state.todos.filter((t) => t.completed).length;
  const active = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  
  statTotal.textContent  = total;
  statActive.textContent = active;
  statDone.textContent   = done;
  badgeAll.textContent       = total;
  badgeActive.textContent    = active;
  badgeCompleted.textContent = done;
  
  sidebarProgress.hidden = total === 0;
  if (total > 0) {
    progressBarFill.style.width = `${percent}%`;
    progressLabelDone.textContent = `${done} of ${total} done`;
    progressLabelPct.textContent  = `${percent}%`;
  }
  
  todoFooter.hidden = total === 0;
  itemsLeft.innerHTML = `<strong>${active}</strong> item${active !== 1 ? 's' : ''} left`;
}

function updateEmptyState(filtered) {
  const hasTodos = state.todos.length > 0;
  const hasFiltered = filtered.length > 0;
  
  if (!hasTodos) {
    emptyState.classList.remove('hidden');
    emptyState.querySelector('h3').textContent = 'No tasks yet';
    emptyState.querySelector('p').textContent = 'Add your first task above to get started.';
  } else if (!hasFiltered) {
    emptyState.classList.remove('hidden');
    const messages = {
      active: { title: 'All caught up!', text: 'No active tasks remaining.' },
      completed: { title: 'No completed tasks yet', text: 'Complete a task to see it here.' },
    };
    const msg = messages[state.filter] || { title: 'No results', text: 'Try a different filter or search.' };
    emptyState.querySelector('h3').textContent = msg.title;
    emptyState.querySelector('p').textContent = msg.text;
  } else {
    emptyState.classList.add('hidden');
  }
}

function render() {
  const filtered = getFilteredTodos();
  todoList.innerHTML = '';
  filtered.forEach((todo) => todoList.appendChild(createTodoElement(todo)));
  updateStats();
  updateEmptyState(filtered);
  clearCompletedBtn.disabled = !state.todos.some((t) => t.completed);
}

function updateCharCount() {
  const len = input.value.length;
  charCount.textContent = `${len}/120`;
  charCount.classList.toggle('warning', len >= 100);
}

// ===== Sidebar toggle =====
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
  sidebarToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
  sidebarToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// ===== Event Listeners =====
form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(input.value, dueInput.value, prioritySelect.value);
});

input.addEventListener('input', updateCharCount);
searchInput.addEventListener('input', (e) => { state.search = e.target.value; render(); });
sortSelect.addEventListener('change', (e) => { state.sort = e.target.value; render(); });

navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    setFilter(btn.dataset.filter);
    if (window.innerWidth < 768) closeSidebar();
  });
});

priorityItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    setPriorityFilter(btn.dataset.priority);
    if (window.innerWidth < 768) closeSidebar();
  });
});

clearCompletedBtn.addEventListener('click', clearCompleted);
logoutBtn.addEventListener('click', () => Auth.logout());
sidebarToggle.addEventListener('click', () => { sidebar.classList.contains('open') ? closeSidebar() : openSidebar(); });
sidebarOverlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input && document.activeElement !== searchInput) {
    e.preventDefault(); input.focus();
  }
  if (e.key === 'Escape') { closeSidebar(); closeModal(); }
});

// ===== Init =====
if (session) {
  setupUserBar();
  loadTodos();
  updateCharCount();
  render();
  input.focus();
}
