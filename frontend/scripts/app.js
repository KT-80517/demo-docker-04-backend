// ToDo frontend in plain JavaScript: no framework, no build step.
// State lives in `todos`; every change calls the API, updates `todos`,
// then re-renders the list with render().
(function () {
  'use strict';

  const API = ((window.APP_CONFIG && window.APP_CONFIG.API_URL) || '').replace(/\/$/, '') + '/api';

  // ---------- API ----------

  async function request(path, method, body) {
    let res;
    try {
      res = await fetch(API + path, {
        method: method || 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      // Browsers report CORS rejections exactly like network failures.
      throw new Error(
        'Cannot reach the API at ' + API + '. Check that the backend is running ' +
          'and allows this origin (CORS_ORIGIN).'
      );
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const details = data && data.details ? ': ' + data.details.join(', ') : '';
      throw new Error(((data && data.error) || 'Request failed (' + res.status + ')') + details);
    }
    return data;
  }

  const api = {
    health: () => request('/health'),
    list: () => request('/todos'),
    create: (todo) => request('/todos', 'POST', todo),
    replace: (id, todo) => request('/todos/' + encodeURIComponent(id), 'PUT', todo),
    update: (id, changes) => request('/todos/' + encodeURIComponent(id), 'PATCH', changes),
    remove: (id) => request('/todos/' + encodeURIComponent(id), 'DELETE'),
  };

  // ---------- State ----------

  let todos = [];
  let filter = 'all';
  let editingId = null;
  let loading = true;

  const FILTERS = {
    all: () => true,
    active: (t) => !t.completed,
    completed: (t) => t.completed,
  };

  // ---------- Elements ----------

  const $ = (id) => document.getElementById(id);
  const form = $('new-todo-form');
  const titleInput = $('new-title');
  const notesInput = $('new-notes');
  const addButton = $('add-button');
  const showNotes = $('show-notes');
  const list = $('todo-list');
  const empty = $('empty');
  const remaining = $('remaining');
  const clearCompleted = $('clear-completed');
  const filterButtons = document.querySelectorAll('[data-filter]');

  // ---------- Helpers ----------

  // Small DOM builder: el('button', { className: 'icon', onclick: fn }, 'text', child)
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const child of children) {
      if (child != null) node.append(child); // strings become text nodes (no HTML injection)
    }
    return node;
  }

  function showError(message) {
    $('error-text').textContent = message;
    $('error').hidden = false;
  }

  function hideError() {
    $('error').hidden = true;
  }

  // Runs an API action and shows any error. Resolves to true on success.
  async function run(action) {
    hideError();
    try {
      await action();
      return true;
    } catch (err) {
      showError(err.message);
      return false;
    } finally {
      render();
    }
  }

  function replaceTodo(updated) {
    todos = todos.map((t) => (t.id === updated.id ? updated : t));
  }

  // ---------- Rendering ----------

  function render() {
    const counts = {
      all: todos.length,
      active: todos.filter(FILTERS.active).length,
      completed: todos.filter(FILTERS.completed).length,
    };

    remaining.textContent = loading ? ' ' : counts.active + (counts.active === 1 ? ' task' : ' tasks') + ' left';

    filterButtons.forEach((btn) => {
      const key = btn.dataset.filter;
      btn.classList.toggle('active', key === filter);
      btn.setAttribute('aria-pressed', String(key === filter));
      btn.querySelector('.count').textContent = counts[key];
    });

    clearCompleted.hidden = counts.completed === 0;
    clearCompleted.textContent = 'Clear completed (' + counts.completed + ')';

    const visible = todos.filter(FILTERS[filter]);
    if (loading || visible.length === 0) {
      list.hidden = true;
      empty.hidden = false;
      empty.textContent = loading
        ? 'Loading…'
        : filter === 'all'
          ? 'Nothing to do yet. Add your first task above.'
          : 'No ' + filter + ' tasks.';
      return;
    }

    empty.hidden = true;
    list.hidden = false;
    list.replaceChildren(...visible.map((t) => (t.id === editingId ? renderEditor(t) : renderItem(t))));

    const editTitle = list.querySelector('.editing input');
    if (editTitle && document.activeElement !== editTitle && !list.contains(document.activeElement)) {
      editTitle.focus();
    }
  }

  function renderItem(todo) {
    const checkbox = el('input', {
      type: 'checkbox',
      checked: todo.completed,
      onchange: () => {
        checkbox.disabled = true;
        checkbox.checked = todo.completed; // wait for the server before showing the change
        run(async () => replaceTodo(await api.update(todo.id, { completed: !todo.completed })));
      },
    });
    checkbox.setAttribute('aria-label', 'Mark "' + todo.title + '" as ' + (todo.completed ? 'not done' : 'done'));

    const body = el(
      'div',
      { className: 'body', ondblclick: () => startEdit(todo.id) },
      el('span', { className: 'title' }, todo.title),
      todo.description ? el('p', { className: 'description' }, todo.description) : null
    );

    const editBtn = el('button', { type: 'button', className: 'icon', onclick: () => startEdit(todo.id) }, '✎');
    editBtn.setAttribute('aria-label', 'Edit "' + todo.title + '"');

    const deleteBtn = el('button', {
      type: 'button',
      className: 'icon danger',
      onclick: () => {
        deleteBtn.disabled = true;
        run(async () => {
          await api.remove(todo.id);
          todos = todos.filter((t) => t.id !== todo.id);
        });
      },
    }, '×');
    deleteBtn.setAttribute('aria-label', 'Delete "' + todo.title + '"');

    return el(
      'li',
      { className: 'todo' + (todo.completed ? ' done' : '') },
      checkbox,
      body,
      el('div', { className: 'actions' }, editBtn, deleteBtn)
    );
  }

  function renderEditor(todo) {
    const title = el('input', { type: 'text', value: todo.title, maxLength: 255 });
    title.setAttribute('aria-label', 'Edit task title');
    const notes = el('textarea', { rows: 2, placeholder: 'Notes (optional)', value: todo.description || '' });
    notes.setAttribute('aria-label', 'Edit task notes');
    const save = el('button', { type: 'submit', className: 'primary' }, 'Save');
    title.oninput = () => (save.disabled = !title.value.trim());

    const editor = el(
      'form',
      {
        onsubmit: async (e) => {
          e.preventDefault();
          if (!title.value.trim()) return;
          save.disabled = true;
          const ok = await run(async () =>
            replaceTodo(
              await api.replace(todo.id, {
                title: title.value.trim(),
                description: notes.value.trim() || null,
                completed: todo.completed,
              })
            )
          );
          if (ok) {
            editingId = null;
            render();
          } else {
            save.disabled = false;
          }
        },
        onkeydown: (e) => {
          if (e.key === 'Escape') cancelEdit();
        },
      },
      title,
      notes,
      el(
        'div',
        { className: 'actions' },
        el('button', { type: 'button', onclick: cancelEdit }, 'Cancel'),
        save
      )
    );
    return el('li', { className: 'todo editing' }, editor);
  }

  function startEdit(id) {
    editingId = id;
    render();
  }

  function cancelEdit() {
    editingId = null;
    render();
  }

  // ---------- Events ----------

  titleInput.addEventListener('input', () => {
    addButton.disabled = !titleInput.value.trim();
  });

  showNotes.addEventListener('click', () => {
    showNotes.hidden = true;
    notesInput.hidden = false;
    notesInput.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    addButton.disabled = true;
    const ok = await run(async () => {
      const created = await api.create({ title, description: notesInput.value.trim() || null });
      todos.push(created);
    });
    if (ok) {
      form.reset();
      notesInput.hidden = true;
      showNotes.hidden = false;
      titleInput.focus();
    } else {
      addButton.disabled = false;
    }
  });

  filterButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      render();
    })
  );

  clearCompleted.addEventListener('click', () =>
    run(async () => {
      const done = todos.filter(FILTERS.completed);
      const results = await Promise.allSettled(done.map((t) => api.remove(t.id)));
      const deleted = new Set(done.filter((_, i) => results[i].status === 'fulfilled').map((t) => t.id));
      todos = todos.filter((t) => !deleted.has(t.id));
      if (deleted.size < done.length) throw new Error('Some todos could not be deleted');
    })
  );

  $('retry').addEventListener('click', load);
  $('dismiss-error').addEventListener('click', hideError);

  // ---------- Start ----------

  async function load() {
    loading = true;
    render();
    await run(async () => {
      try {
        const [items, health] = await Promise.all([api.list(), api.health()]);
        todos = items;
        $('source').textContent = 'Storage: ' + health.dataSource;
      } finally {
        loading = false;
      }
    });
  }

  load();
})();
