/**
 * Work Whisper — Dashboard App
 */

const session = Auth.requireAuth();

const state = {
  todos: [],
  filter: 'all',
};

function getStorageKey() {
  return Auth.getTodosKey(session.userId);
}

// ===== DOM Elements =====
const form          = document.getElementById('todo-form');
const input         = document.getElementById('todo-input');
const charCount     = document.getElementById('char-count');
const todoList      = document.getElementById('todo-list');
const emptyState    = document.getElementById('empty-state');
const todoFooter    = document.getElementById('todo-footer');
const itemsLeft     = document.getElementById('items-left');
const clearCompletedBtn = document.getElementById('clear-completed');
const toastContainer    = document.getElementById('toast-container');

// Sidebar / topbar
const userAvatar    = document.getElementById('user-avatar');
const userName      = document.getElementById('user-name');
const userEmail     = document.getElementById('user-email');
const logoutBtn     = document.getElementById('logout-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar       = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const navItems      = document.querySelectorAll('.sidebar-nav-item');

// Stats
const statTotal     = document.getElementById('stat-total');
const statActive    = document.getElementById('stat-active');
const statDone      = document.getElementById('stat-done');
const badgeAll      = document.getElementById('badge-all');
const badgeActive   = document.getElementById('badge-active');
const badgeCompleted = document.getElementById('badge-completed');
const sidebarProgress = document.getElementById('sidebar-progress');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressLabelDone = document.getElementById('progress-label-done');
const progressLabelPct  = document.getElementById('progress-label-pct');
const topbarTitle   = document.getElementById('topbar-title');
const topbarSubtitle = document.getElementById('topbar-subtitle');

// ===== Utilities =====

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
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

// ===== Todo Operations =====

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    showToast('Please enter a task', 'error');
    input.focus();
    return;
  }

  if (state.todos.some((t) => t.text.toLowerCase() === trimmed.toLowerCase())) {
    showToast('This task already exists', 'error');
    return;
  }

  state.todos.unshift({
    id: generateId(),
    text: trimmed,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  saveTodos();
  input.value = '';
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
  }
}

function deleteTodo(id) {
  const item = todoList.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
    setTimeout(() => {
      state.todos = state.todos.filter((t) => t.id !== id);
      saveTodos();
      render();
      showToast('Task deleted');
    }, 250);
  }
}

function editTodo(id, newText) {
  const trimmed = newText.trim();
  const todo = state.todos.find((t) => t.id === id);

  if (!todo) return;

  if (!trimmed) {
    showToast('Task cannot be empty', 'error');
    render();
    return;
  }

  if (state.todos.some((t) => t.id !== id && t.text.toLowerCase() === trimmed.toLowerCase())) {
    showToast('This task already exists', 'error');
    render();
    return;
  }

  todo.text = trimmed;
  saveTodos();
  render();
  showToast('Task updated');
}

function clearCompleted() {
  const count = state.todos.filter((t) => t.completed).length;
  if (count === 0) return;

  state.todos = state.todos.filter((t) => !t.completed);
  saveTodos();
  render();
  showToast(`${count} completed task${count > 1 ? 's' : ''} cleared`);
}

function setFilter(filter) {
  state.filter = filter;

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

function getFilteredTodos() {
  switch (state.filter) {
    case 'active':    return state.todos.filter((t) => !t.completed);
    case 'completed': return state.todos.filter((t) => t.completed);
    default:          return state.todos;
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
  li.dataset.id = todo.id;

  li.innerHTML = `
    <label class="todo-checkbox" aria-label="Mark as ${todo.completed ? 'incomplete' : 'complete'}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-hidden="true">
      <span class="checkbox-custom">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
    </label>
    <div class="todo-content">
      <span class="todo-text" tabindex="0">${escapeHtml(todo.text)}</span>
      <span class="todo-date">${formatDate(todo.createdAt)}</span>
    </div>
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

  li.querySelector('.todo-checkbox input').addEventListener('change', () => toggleTodo(todo.id));
  li.querySelector('.btn-icon.delete').addEventListener('click', () => deleteTodo(todo.id));
  li.querySelector('.btn-icon.edit').addEventListener('click', () => startEditing(li, todo));

  const textEl = li.querySelector('.todo-text');
  textEl.addEventListener('dblclick', () => startEditing(li, todo));
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startEditing(li, todo);
    }
  });

  return li;
}

function startEditing(li, todo) {
  const content = li.querySelector('.todo-content');

  content.innerHTML = `
    <input type="text" class="todo-edit-input" value="${escapeHtml(todo.text)}" maxlength="120" aria-label="Edit task">
  `;

  const editInput = content.querySelector('.todo-edit-input');
  editInput.focus();
  editInput.select();

  function finishEdit() {
    editTodo(todo.id, editInput.value);
  }

  editInput.addEventListener('blur', finishEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); editInput.blur(); }
    if (e.key === 'Escape') render();
  });
}

function updateStats() {
  const total     = state.todos.length;
  const done      = state.todos.filter((t) => t.completed).length;
  const active    = total - done;
  const percent   = total > 0 ? Math.round((done / total) * 100) : 0;

  // Topbar chips
  statTotal.textContent  = total;
  statActive.textContent = active;
  statDone.textContent   = done;

  // Sidebar badges
  badgeAll.textContent       = total;
  badgeActive.textContent    = active;
  badgeCompleted.textContent = done;

  // Sidebar progress bar
  sidebarProgress.hidden = total === 0;
  if (total > 0) {
    progressBarFill.style.width = `${percent}%`;
    progressLabelDone.textContent = `${done} of ${total} done`;
    progressLabelPct.textContent  = `${percent}%`;
  }

  // Footer
  todoFooter.hidden = total === 0;
  itemsLeft.innerHTML = `<strong>${active}</strong> item${active !== 1 ? 's' : ''} left`;
}

function updateEmptyState(filtered) {
  const hasTodos    = state.todos.length > 0;
  const hasFiltered = filtered.length > 0;

  if (!hasTodos) {
    emptyState.classList.remove('hidden');
    emptyState.querySelector('h3').textContent = 'No tasks yet';
    emptyState.querySelector('p').textContent  = 'Add your first task above to get started.';
  } else if (!hasFiltered) {
    emptyState.classList.remove('hidden');
    const messages = {
      active:    { title: 'All caught up!',        text: 'No active tasks remaining.' },
      completed: { title: 'No completed tasks yet', text: 'Complete a task to see it here.' },
    };
    const msg = messages[state.filter] || messages.active;
    emptyState.querySelector('h3').textContent = msg.title;
    emptyState.querySelector('p').textContent  = msg.text;
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

// ===== Sidebar toggle (mobile) =====

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

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

sidebarOverlay.addEventListener('click', closeSidebar);

// ===== Event Listeners =====

form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(input.value);
});

input.addEventListener('input', updateCharCount);

navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    setFilter(btn.dataset.filter);
    // Close sidebar on mobile after selecting a filter
    if (window.innerWidth < 768) closeSidebar();
  });
});

clearCompletedBtn.addEventListener('click', clearCompleted);
logoutBtn.addEventListener('click', () => Auth.logout());

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
  }
  if (e.key === 'Escape') closeSidebar();
});

// ===== Init =====

if (session) {
  setupUserBar();
  loadTodos();
  updateCharCount();
  render();
  input.focus();
}
