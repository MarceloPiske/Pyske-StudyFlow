import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class NotesModule {
  constructor() {
    this.notes = [];
    this.topics = [];
    this.books = [];
  }

  async render(user) {
    await Promise.all([
      this.loadNotes(user),
      this.loadTopics(user),
      this.loadBooks(user)
    ]);

    return `
      <div class="notes-container">
        <div class="notes-header">
          <h1>Anotações</h1>
          <button id="add-note-btn" class="btn btn-primary">
            <span>📝</span> Nova Anotação
          </button>
        </div>

        <div class="notes-search">
          <input type="text" id="notes-search" class="form-input" placeholder="Buscar nas anotações...">
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Todas as Anotações</h3>
            </div>
            <div class="card-body">
              <div id="notes-list" class="notes-list">
                ${this.renderNotesList()}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Editor de Anotação</h3>
            </div>
            <div class="card-body">
              <form id="note-form">
                <input type="hidden" id="note-id">

                <div class="form-group">
                  <label class="form-label">Título</label>
                  <input type="text" id="note-title" class="form-input" placeholder="Título da anotação" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Tipo de Anotação</label>
                  <select id="note-type" class="form-input">
                    <option value="internal_note">Nota Interna</option>
                    <option value="google_doc">Link do Google Docs</option>
                    <option value="drive_link">Link do Google Drive</option>
                    <option value="external_link">Link Externo</option>
                  </select>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Tópico</label>
                    <select id="note-topic" class="form-input">
                      <option value="">Selecione um tópico</option>
                      ${this.renderTopicOptions()}
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Livro (opcional)</label>
                    <select id="note-book" class="form-input">
                      <option value="">Selecione um livro</option>
                      ${this.renderBookOptions()}
                    </select>
                  </div>
                </div>

                <div class="form-group" id="content-group">
                  <label class="form-label">Conteúdo</label>
                  <div class="editor-toolbar" id="editor-toolbar">
                    <button type="button" class="btn-tool" data-command="bold"><b>B</b></button>
                    <button type="button" class="btn-tool" data-command="italic"><i>I</i></button>
                    <button type="button" class="btn-tool" data-command="underline"><u>U</u></button>
                    <button type="button" class="btn-tool" data-command="insertUnorderedList">• Lista</button>
                    <button type="button" class="btn-tool" data-command="insertOrderedList">1. Lista</button>
                  </div>
                  <div 
                    id="note-content" 
                    class="note-editor" 
                    contenteditable="true" 
                    placeholder="Escreva sua anotação aqui..."
                  ></div>
                  <input 
                    type="url" 
                    id="note-link" 
                    class="form-input hidden" 
                    placeholder="Cole o link aqui..."
                  >
                </div>

                <div class="form-group">
                  <label class="form-label">Tags (separadas por vírgula)</label>
                  <input type="text" id="note-tags" class="form-input" placeholder="teologia, cristologia, patrística">
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Salvar</button>
                  <button type="button" id="cancel-note" class="btn btn-secondary">Cancelar</button>
                  <button type="button" id="clear-note" class="btn btn-ghost">Limpar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadNotes(user) {
    try {
      const notesQuery = query(
        collection(window.db, 'notes'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(notesQuery);

      this.notes = [];
      snapshot.forEach(doc => {
        this.notes.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }

  async loadTopics(user) {
    try {
      const topicsQuery = query(
        collection(window.db, 'topics'),
        where('userId', '==', user.uid),
        orderBy('name')
      );
      const snapshot = await getDocs(topicsQuery);

      this.topics = [];
      snapshot.forEach(doc => {
        this.topics.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  }

  async loadBooks(user) {
    try {
      const booksQuery = query(
        collection(window.db, 'books'),
        where('userId', '==', user.uid),
        orderBy('title')
      );
      const snapshot = await getDocs(booksQuery);

      this.books = [];
      snapshot.forEach(doc => {
        this.books.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }

  renderNotesList() {
    if (!this.notes.length) {
      return '<div class="empty-state">Nenhuma anotação criada ainda.</div>';
    }

    return this.notes.map(note => `
      <div class="note-item" data-note-id="${note.id}">
        <div class="note-header">
          <h4 class="note-title">${note.title}</h4>
          <div class="note-type-badge ${note.type}">${this.getTypeBadge(note.type)}</div>
          <div class="note-actions">
            <button class="btn-edit" data-note-id="${note.id}">✏️</button>
            <button class="btn-delete" data-note-id="${note.id}">🗑️</button>
          </div>
        </div>
        <div class="note-meta">
          ${note.topicName ? `<span class="note-topic clickable" data-topic-id="${note.topicId}">📚 ${note.topicName}</span>` : ''}
          ${note.bookTitle ? `<span class="note-book clickable" data-book-id="${note.bookId}">📖 ${note.bookTitle}</span>` : ''}
        </div>
        <div class="note-preview">${this.getContentPreview(note)}</div>
        ${note.tags ? `
          <div class="note-tags">
            ${note.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
          </div>
        ` : ''}
        <div class="note-date">${this.formatDate(note.createdAt?.toDate())}</div>
      </div>
    `).join('');
  }

  getTypeBadge(type) {
    const badges = {
      'internal_note': '📝 Nota',
      'google_doc': '📄 Google Docs',
      'drive_link': '💾 Drive',
      'external_link': '🔗 Link'
    };
    return badges[type] || '📝';
  }

  getContentPreview(note) {
    if (note.type === 'internal_note') {
      const temp = document.createElement('div');
      temp.innerHTML = note.content || '';
      const text = temp.textContent || temp.innerText || '';
      return text.length > 150 ? text.substring(0, 150) + '...' : text;
    } else {
      return `<a href="${note.content}" target="_blank" rel="noopener noreferrer">${note.content}</a>`;
    }
  }

  renderTopicOptions() {
    return this.topics.map(topic => 
      `<option value="${topic.id}">${topic.name}</option>`
    ).join('');
  }

  renderBookOptions() {
    return this.books.map(book => 
      `<option value="${book.id}">${book.title} - ${book.author}</option>`
    ).join('');
  }

  formatDate(date) {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add note button
    document.getElementById('add-note-btn')?.addEventListener('click', () => {
      this.clearForm();
    });

    // Note type change
    document.getElementById('note-type')?.addEventListener('change', (e) => {
      this.toggleContentInput(e.target.value);
    });

    // Form submission
    document.getElementById('note-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Cancel and clear buttons
    document.getElementById('cancel-note')?.addEventListener('click', () => {
      this.clearForm();
    });

    document.getElementById('clear-note')?.addEventListener('click', () => {
      this.clearForm();
    });

    // Editor toolbar
    document.querySelectorAll('.btn-tool').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = e.target.dataset.command;
        document.execCommand(command, false, null);
        document.getElementById('note-content').focus();
      });
    });

    // Search
    document.getElementById('notes-search')?.addEventListener('input', (e) => {
      this.filterNotes(e.target.value);
    });

    // Note actions
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit')) {
        const noteId = e.target.dataset.noteId;
        this.editNote(noteId);
      } else if (e.target.classList.contains('btn-delete')) {
        const noteId = e.target.dataset.noteId;
        this.deleteNote(noteId);
      } else if (e.target.closest('.note-item')) {
        const noteId = e.target.closest('.note-item').dataset.noteId;
        this.selectNote(noteId);
      } else if (e.target.classList.contains('clickable')) {
        if (e.target.dataset.topicId) {
          window.app.navigateToSection('topics', { highlightTopic: e.target.dataset.topicId });
        } else if (e.target.dataset.bookId) {
          window.app.navigateToSection('books', { highlightBook: e.target.dataset.bookId });
        }
      }
    });
  }

  toggleContentInput(type) {
    const contentGroup = document.getElementById('content-group');
    const editor = document.getElementById('note-content');
    const linkInput = document.getElementById('note-link');
    const toolbar = document.getElementById('editor-toolbar');

    if (type === 'internal_note') {
      editor.classList.remove('hidden');
      linkInput.classList.add('hidden');
      toolbar.classList.remove('hidden');
      linkInput.required = false;
      editor.setAttribute('contenteditable', 'true');
    } else {
      editor.classList.add('hidden');
      linkInput.classList.remove('hidden');
      toolbar.classList.add('hidden');
      linkInput.required = true;
      editor.setAttribute('contenteditable', 'false');
    }
  }

  filterNotes(searchTerm) {
    const filtered = this.notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.tags && note.tags.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    document.getElementById('notes-list').innerHTML = 
      filtered.length ? filtered.map(note => this.renderNoteItem(note)).join('') : 
      '<div class="empty-state">Nenhuma anotação encontrada.</div>';
  }

  async handleFormSubmit() {
    const noteId = document.getElementById('note-id').value;
    const title = document.getElementById('note-title').value.trim();
    const type = document.getElementById('note-type').value;
    const topicId = document.getElementById('note-topic').value;
    const bookId = document.getElementById('note-book').value;
    const tags = document.getElementById('note-tags').value.trim();

    let content;
    if (type === 'internal_note') {
      content = document.getElementById('note-content').innerHTML;
    } else {
      content = document.getElementById('note-link').value.trim();
    }

    if (!title || !content) return;

    try {
      const selectedTopic = this.topics.find(t => t.id === topicId);
      const selectedBook = this.books.find(b => b.id === bookId);

      const noteData = {
        title,
        type,
        content,
        topicId: topicId || null,
        topicName: selectedTopic?.name || null,
        bookId: bookId || null,
        bookTitle: selectedBook?.title || null,
        tags: tags || null,
        userId: window.auth.currentUser.uid
      };

      if (noteId) {
        noteData.updatedAt = new Date();
        await updateDoc(doc(window.db, 'notes', noteId), noteData);
      } else {
        noteData.createdAt = new Date();
        await addDoc(collection(window.db, 'notes'), noteData);
      }

      window.app.navigateToSection('notes');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }

  selectNote(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    // Highlight selected note
    document.querySelectorAll('.note-item').forEach(item => {
      item.classList.remove('selected');
    });
    document.querySelector(`[data-note-id="${noteId}"]`).classList.add('selected');

    // Load note into editor
    this.editNote(noteId);
  }

  editNote(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    document.getElementById('note-id').value = note.id;
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-type').value = note.type || 'internal_note';
    document.getElementById('note-topic').value = note.topicId || '';
    document.getElementById('note-book').value = note.bookId || '';
    document.getElementById('note-tags').value = note.tags || '';

    this.toggleContentInput(note.type || 'internal_note');

    if (note.type === 'internal_note') {
      document.getElementById('note-content').innerHTML = note.content;
    } else {
      document.getElementById('note-link').value = note.content;
    }
  }

  async deleteNote(noteId) {
    if (!confirm('Tem certeza que deseja excluir esta anotação?')) return;

    try {
      await deleteDoc(doc(window.db, 'notes', noteId));
      window.app.navigateToSection('notes');
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }

  clearForm() {
    document.getElementById('note-form').reset();
    document.getElementById('note-id').value = '';
    document.getElementById('note-content').innerHTML = '';
    document.getElementById('note-link').value = '';
    this.toggleContentInput('internal_note');

    // Clear selection
    document.querySelectorAll('.note-item').forEach(item => {
      item.classList.remove('selected');
    });
  }

  renderNoteItem(note) {
    return `
      <div class="note-item" data-note-id="${note.id}">
        <div class="note-header">
          <h4 class="note-title">${note.title}</h4>
          <div class="note-type-badge ${note.type}">${this.getTypeBadge(note.type)}</div>
          <div class="note-actions">
            <button class="btn-edit" data-note-id="${note.id}">✏️</button>
            <button class="btn-delete" data-note-id="${note.id}">🗑️</button>
          </div>
        </div>
        <div class="note-meta">
          ${note.topicName ? `<span class="note-topic clickable" data-topic-id="${note.topicId}">📚 ${note.topicName}</span>` : ''}
          ${note.bookTitle ? `<span class="note-book clickable" data-book-id="${note.bookId}">📖 ${note.bookTitle}</span>` : ''}
        </div>
        <div class="note-preview">${this.getContentPreview(note)}</div>
        ${note.tags ? `
          <div class="note-tags">
            ${note.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
          </div>
        ` : ''}
        <div class="note-date">${this.formatDate(note.createdAt?.toDate())}</div>
      </div>
    `;
  }
}