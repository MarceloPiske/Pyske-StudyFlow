import { BookDetailView } from './book-detail-view.js';

export class BooksModule {
  constructor() {
    this.books = [];
    this.relatedTopics = [];
    this.detailView = new BookDetailView();
  }

  // Main render method for list view
  async render(topicsData = [], booksData = []) {
    this.relatedTopics = topicsData;
    this.books = booksData;

    return this.renderListView();
  }

  // Render detail view for a specific book
  async renderDetailView(bookId, allTopics, firestoreService) {
    return await this.detailView.render(bookId, allTopics, firestoreService);
  }

  renderListView() {
    return `
      <div class="books-container">
        <div class="books-header">
          <h1>Biblioteca Pessoal</h1>
          <button id="add-book-btn" class="btn btn-primary">
            <span class="material-icons">library_add</span> Adicionar Livro
          </button>
        </div>

        <div class="books-filters">
          <button class="filter-btn active" data-filter="all">Todos</button>
          <button class="filter-btn" data-filter="reading">Lendo</button>
          <button class="filter-btn" data-filter="read">Lidos</button>
          <button class="filter-btn" data-filter="want-to-read">Quero Ler</button>
        </div>

        <div class="grid grid-3" id="books-grid">
          ${this.renderBooks()}
        </div>

        <!-- Book Form Modal is now managed by ModalManager -->
      </div>
    `;
  }

  renderBooks(filter = 'all') {
    const filteredBooks = filter === 'all' ? this.books : this.books.filter(book => book.status === filter);

    if (!filteredBooks.length) {
      return '<div class="empty-state">Nenhum livro encontrado.</div>';
    }

    return filteredBooks.map(book => this.renderBookCard(book)).join('');
  }

  renderBookCard(book) {
    const progress = book.totalPages ? Math.round((book.currentPage || 0) / book.totalPages * 100) : 0;
    const statusLabels = {
      'want-to-read': 'Quero Ler',
      'reading': 'Lendo',
      'read': 'Lido'
    };

    return `
      <div class="card book-card" data-book-id="${book.id}">
        <div class="book-cover">
          <img src="${book.coverUrl || '/placeholder-book.png'}" alt="Capa de ${book.title}" loading="lazy">
        </div>
        <div class="card-body">
          <h3 class="book-title" data-book-id="${book.id}">${book.title}</h3>
          <p class="book-author">${book.author}</p>
          <div class="book-status ${book.status}">${statusLabels[book.status]}</div>

          ${book.status === 'reading' ? `
            <div class="book-progress">
              <div class="progress">
                <div class="progress-bar" style="width: ${progress}%"></div>
              </div>
              <span class="progress-text">${book.currentPage || 0}/${book.totalPages || 0} páginas (${progress}%)</span>
            </div>
          ` : ''}

          ${book.rating ? `
            <div class="book-rating">
              ${'⭐'.repeat(book.rating)}
            </div>
          ` : ''}

          ${book.relatedTopicIds && book.relatedTopicIds.length ? `
            <div class="book-topics">
              <span class="topics-label">Tópicos:</span>
              ${book.relatedTopicIds.map(topicId => {
                const topic = this.getTopicById(topicId);
                return topic ? `<span class="topic-tag" data-topic-id="${topicId}">${topic.name}</span>` : '';
              }).filter(Boolean).join('')}
            </div>
          ` : ''}

          <div class="book-actions">
            <button class="btn-edit" data-book-id="${book.id}">Editar</button>
            <button class="btn-delete" data-book-id="${book.id}">Excluir</button>
            <button class="btn-study" data-book-id="${book.id}" data-book-title="${book.title}">Estudar</button>
          </div>
        </div>
      </div>
    `;
  }

  getTopicById(topicId) {
    return this.relatedTopics?.find(t => t.id === topicId);
  }

  renderTopicsCheckboxes(selectedIds = []) {
    if (!this.relatedTopics?.length) {
      return '<p class="empty-state">Crie alguns tópicos primeiro para relacioná-los aos livros.</p>';
    }

    return this.relatedTopics.map(topic => `
      <label class="topic-checkbox">
        <input type="checkbox" value="${topic.id}" data-topic-name="${topic.name}" ${selectedIds.includes(topic.id) ? 'checked' : ''}>
        <span>${topic.name}</span>
      </label>
    `).join('');
  }

  // Initialize list view listeners
  initListViewListeners() {
    this.setupEventListeners();
  }

  // Initialize detail view listeners
  initDetailViewListeners(firestoreService) {
    this.detailView.setupListeners(firestoreService);
  }

  setupEventListeners() {
    // Add book button
    document.getElementById('add-book-btn')?.addEventListener('click', () => {
      this.showBookFormModal();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const filter = e.target.dataset.filter;
        document.getElementById('books-grid').innerHTML = this.renderBooks(filter);
      });
    });

    // Book actions
    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');
      const studyBtn = e.target.closest('.btn-study');
      const topicTag = e.target.closest('.topic-tag');
      const bookTitleEl = e.target.closest('.book-title');

      if (editBtn) {
        const bookId = editBtn.dataset.bookId;
        this.showBookFormModal(bookId);
      } else if (deleteBtn) {
        const bookId = deleteBtn.dataset.bookId;
        this.deleteBook(bookId, window.app.firestoreService);
      } else if (studyBtn) {
        const bookId = studyBtn.dataset.bookId;
        const bookTitle = studyBtn.dataset.bookTitle;
        this.startStudySession(bookId, bookTitle);
      } else if (topicTag) {
        const topicId = topicTag.dataset.topicId;
        window.app.navigateToSection('topics', { detailId: topicId });
      } else if (bookTitleEl) {
        const bookId = bookTitleEl.dataset.bookId;
        window.app.navigateToSection('books', { detailId: bookId });
      }
    });
  }

  showBookFormModal(bookId = null) {
    const book = bookId ? this.books.find(b => b.id === bookId) : null;
    const title = book ? 'Editar Livro' : 'Adicionar Livro';
    this.selectedRating = book?.rating || null;

    const content = `
      <form id="book-form">
        <input type="hidden" id="book-id" value="${book ? book.id : ''}">

        <div class="form-group">
          <label class="form-label">Buscar por ISBN (opcional)</label>
          <div class="isbn-search">
            <input type="text" id="book-isbn" class="form-input" placeholder="Ex: 9788573590837">
            <button type="button" id="search-isbn" class="btn btn-secondary">Buscar</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Título</label>
          <input type="text" id="book-title" class="form-input" value="${book?.title || ''}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Autor</label>
          <input type="text" id="book-author" class="form-input" value="${book?.author || ''}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Status</label>
          <select id="book-status" class="form-input">
            <option value="want-to-read" ${book?.status === 'want-to-read' ? 'selected' : ''}>Quero Ler</option>
            <option value="reading" ${book?.status === 'reading' ? 'selected' : ''}>Lendo</option>
            <option value="read" ${book?.status === 'read' ? 'selected' : ''}>Lido</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Página Atual</label>
            <input type="number" id="book-current-page" class="form-input" min="0" value="${book?.currentPage || 0}">
          </div>
          <div class="form-group">
            <label class="form-label">Total de Páginas</label>
            <input type="number" id="book-total-pages" class="form-input" min="1" value="${book?.totalPages || ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Avaliação</label>
          <div class="rating-input" id="book-rating">
            ${[1,2,3,4,5].map(i => `<span class="star material-icons" data-rating="${i}">star</span>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Resenha Pessoal</label>
          <textarea id="book-review" class="form-input" rows="3" placeholder="Suas impressões sobre o livro...">${book?.review || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Tópicos Relacionados</label>
          <div class="topics-selector" id="book-topics-selector">
            ${this.renderTopicsCheckboxes(book?.relatedTopicIds)}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">URL da Capa</label>
          <input type="url" id="book-cover" class="form-input" value="${book?.coverUrl || ''}">
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="btn-text">Salvar</span>
            <span class="btn-loading hidden">Salvando...</span>
          </button>
          <button type="button" id="cancel-book" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    window.app.modalManager.show({
      title,
      content,
      onMount: (modalElement) => {
        modalElement.querySelector('#book-form').addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleFormSubmit(modalElement);
        });

        modalElement.querySelector('#cancel-book').addEventListener('click', () => {
          window.app.modalManager.hide();
        });

        modalElement.querySelector('#search-isbn').addEventListener('click', () => {
          this.searchByISBN(modalElement);
        });

        modalElement.querySelectorAll('#book-rating .star').forEach(star => {
          star.addEventListener('click', (e) => {
            this.setRating(parseInt(e.target.dataset.rating, 10), modalElement);
          });
        });

        if (book?.rating) {
          this.setRating(book.rating, modalElement);
        }
      }
    });
  }

  async searchByISBN(modalElement) {
    const isbn = modalElement.querySelector('#book-isbn').value.trim();
    if (!isbn) return;

    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;

        modalElement.querySelector('#book-title').value = book.title || '';
        modalElement.querySelector('#book-author').value = book.authors?.join(', ') || '';
        modalElement.querySelector('#book-total-pages').value = book.pageCount || '';
        modalElement.querySelector('#book-cover').value = book.imageLinks?.thumbnail || '';
      } else {
        alert('Livro não encontrado. Preencha os dados manualmente.');
      }
    } catch (error) {
      console.error('Error searching book:', error);
      alert('Erro ao buscar livro. Tente novamente.');
    }
  }

  setRating(rating, modalElement) {
    modalElement.querySelectorAll('#book-rating .star').forEach((star, index) => {
      star.style.opacity = index < rating ? '1' : '0.3';
    });
    this.selectedRating = rating;
  }

  async handleFormSubmit(modalElement) {
    const submitBtn = modalElement.querySelector('#book-form button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
      const firestoreService = window.app.firestoreService;
      const bookId = modalElement.querySelector('#book-id').value;
      const title = modalElement.querySelector('#book-title').value.trim();
      const author = modalElement.querySelector('#book-author').value.trim();
      const status = modalElement.querySelector('#book-status').value;
      const currentPage = parseInt(modalElement.querySelector('#book-current-page').value) || 0;
      const totalPages = parseInt(modalElement.querySelector('#book-total-pages').value) || 0;
      const coverUrl = modalElement.querySelector('#book-cover').value.trim();
      const review = modalElement.querySelector('#book-review').value.trim();

      // Get selected topics
      const selectedTopics = [];
      modalElement.querySelectorAll('#book-topics-selector input[type="checkbox"]:checked').forEach(checkbox => {
        selectedTopics.push(checkbox.value);
      });

      if (!title || !author) {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        return;
      };

      const bookData = {
        title,
        author,
        status,
        currentPage,
        totalPages,
        coverUrl,
        review,
        relatedTopicIds: selectedTopics,
        rating: this.selectedRating || null
      };

      if (bookId) {
        await firestoreService.updateDocument('books', bookId, bookData);
      } else {
        await firestoreService.createDocument('books', bookData);
      }

      window.app.modalManager.hide();
      // Use new refresh method instead of full navigation
      await window.app.refreshDataAndReRender('books');
    } catch (error) {
      console.error('Error saving book:', error);
      alert('Erro ao salvar livro. Tente novamente.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  editBook(bookId) {
    const book = this.books.find(b => b.id === bookId);
    if (!book) return;

    document.getElementById('book-id').value = book.id;
    document.getElementById('book-title').value = book.title;
    document.getElementById('book-author').value = book.author;
    document.getElementById('book-status').value = book.status;
    document.getElementById('book-current-page').value = book.currentPage || 0;
    document.getElementById('book-total-pages').value = book.totalPages || 0;
    document.getElementById('book-cover').value = book.coverUrl || '';
    document.getElementById('book-review').value = book.review || '';

    // Set selected topics
    document.querySelectorAll('#book-topics-selector input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = book.relatedTopicIds?.includes(checkbox.value) || false;
    });

    if (book.rating) {
      this.setRating(book.rating);
    }

    this.showModal();
  }

  async deleteBook(bookId, firestoreService) {
    if (!confirm('Tem certeza que deseja excluir este livro?')) return;

    try {
      await firestoreService.deleteDocument('books', bookId);
      // Use new refresh method instead of full navigation
      await window.app.refreshDataAndReRender('books');
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Erro ao excluir livro. Tente novamente.');
    }
  }

  startStudySession(bookId, bookTitle) {
    const book = this.books.find(b => b.id === bookId);
    if (book && book.relatedTopicIds && book.relatedTopicIds.length > 0) {
      const primaryTopicId = book.relatedTopicIds[0];
      const topic = this.relatedTopics.find(t => t.id === primaryTopicId);
      if (topic) {
        window.app.startStudySession(primaryTopicId, topic.name, bookId);
        return;
      }
    }
    
    // If no related topics, start a generic study session
    window.app.startStudySession(null, `Lendo: ${bookTitle}`, bookId);
  }

  clearForm() {
    document.getElementById('book-form').reset();
    document.getElementById('book-id').value = '';
    this.selectedRating = null;
    document.querySelectorAll('#book-rating .star').forEach(star => {
      star.style.opacity = '0.3';
    });
    // Clear topic selections
    document.querySelectorAll('#book-topics-selector input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
    });
  }
}