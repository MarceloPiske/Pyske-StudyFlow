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

export class BooksModule {
  constructor() {
    this.books = [];
  }

  async render(user) {
    await this.loadBooks(user);

    return `
      <div class="books-container">
        <div class="books-header">
          <h1>Biblioteca Pessoal</h1>
          <button id="add-book-btn" class="btn btn-primary">
            <span>📚</span> Adicionar Livro
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

        <!-- Book Form Modal -->
        <div id="book-modal" class="modal hidden">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Adicionar/Editar Livro</h2>
              <button id="close-modal" class="btn-close">✕</button>
            </div>
            <div class="modal-body">
              <form id="book-form">
                <input type="hidden" id="book-id">

                <div class="form-group">
                  <label class="form-label">Buscar por ISBN (opcional)</label>
                  <div class="isbn-search">
                    <input type="text" id="book-isbn" class="form-input" placeholder="Ex: 9788573590837">
                    <button type="button" id="search-isbn" class="btn btn-secondary">Buscar</button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Título</label>
                  <input type="text" id="book-title" class="form-input" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Autor</label>
                  <input type="text" id="book-author" class="form-input" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Status</label>
                  <select id="book-status" class="form-input">
                    <option value="want-to-read">Quero Ler</option>
                    <option value="reading">Lendo</option>
                    <option value="read">Lido</option>
                  </select>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Página Atual</label>
                    <input type="number" id="book-current-page" class="form-input" min="0">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Total de Páginas</label>
                    <input type="number" id="book-total-pages" class="form-input" min="1">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Avaliação</label>
                  <div class="rating-input" id="book-rating">
                    ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}">⭐</span>`).join('')}
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">URL da Capa</label>
                  <input type="url" id="book-cover" class="form-input">
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Salvar</button>
                  <button type="button" id="cancel-book" class="btn btn-secondary">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadBooks(user) {
    try {
      const booksQuery = query(
        collection(window.db, 'books'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
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
          <h3 class="book-title">${book.title}</h3>
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

          <div class="book-actions">
            <button class="btn-edit" data-book-id="${book.id}">Editar</button>
            <button class="btn-delete" data-book-id="${book.id}">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add book button
    document.getElementById('add-book-btn')?.addEventListener('click', () => {
      this.showModal();
    });

    // Close modal
    document.getElementById('close-modal')?.addEventListener('click', () => {
      this.hideModal();
    });

    // Cancel button
    document.getElementById('cancel-book')?.addEventListener('click', () => {
      this.hideModal();
    });

    // Form submission
    document.getElementById('book-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // ISBN search
    document.getElementById('search-isbn')?.addEventListener('click', () => {
      this.searchByISBN();
    });

    // Rating stars
    document.querySelectorAll('#book-rating .star').forEach(star => {
      star.addEventListener('click', (e) => {
        this.setRating(parseInt(e.target.dataset.rating));
      });
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
      if (e.target.classList.contains('btn-edit')) {
        const bookId = e.target.dataset.bookId;
        this.editBook(bookId);
      } else if (e.target.classList.contains('btn-delete')) {
        const bookId = e.target.dataset.bookId;
        this.deleteBook(bookId);
      }
    });
  }

  async searchByISBN() {
    const isbn = document.getElementById('book-isbn').value.trim();
    if (!isbn) return;

    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;

        document.getElementById('book-title').value = book.title || '';
        document.getElementById('book-author').value = book.authors?.join(', ') || '';
        document.getElementById('book-total-pages').value = book.pageCount || '';
        document.getElementById('book-cover').value = book.imageLinks?.thumbnail || '';
      } else {
        alert('Livro não encontrado. Preencha os dados manualmente.');
      }
    } catch (error) {
      console.error('Error searching book:', error);
      alert('Erro ao buscar livro. Tente novamente.');
    }
  }

  setRating(rating) {
    document.querySelectorAll('#book-rating .star').forEach((star, index) => {
      star.style.opacity = index < rating ? '1' : '0.3';
    });
    this.selectedRating = rating;
  }

  showModal() {
    document.getElementById('book-modal').classList.remove('hidden');
    this.clearForm();
  }

  hideModal() {
    document.getElementById('book-modal').classList.add('hidden');
  }

  async handleFormSubmit() {
    const bookId = document.getElementById('book-id').value;
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('book-author').value.trim();
    const status = document.getElementById('book-status').value;
    const currentPage = parseInt(document.getElementById('book-current-page').value) || 0;
    const totalPages = parseInt(document.getElementById('book-total-pages').value) || 0;
    const coverUrl = document.getElementById('book-cover').value.trim();

    if (!title || !author) return;

    try {
      const bookData = {
        title,
        author,
        status,
        currentPage,
        totalPages,
        coverUrl,
        rating: this.selectedRating || null,
        userId: window.auth.currentUser.uid
      };

      if (bookId) {
        await updateDoc(doc(window.db, 'books', bookId), bookData);
      } else {
        bookData.createdAt = new Date();
        await addDoc(collection(window.db, 'books'), bookData);
      }

      this.hideModal();
      window.app.navigateToSection('books');
    } catch (error) {
      console.error('Error saving book:', error);
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

    if (book.rating) {
      this.setRating(book.rating);
    }

    this.showModal();
  }

  async deleteBook(bookId) {
    if (!confirm('Tem certeza que deseja excluir este livro?')) return;

    try {
      await deleteDoc(doc(window.db, 'books', bookId));
      window.app.navigateToSection('books');
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  }

  clearForm() {
    document.getElementById('book-form').reset();
    document.getElementById('book-id').value = '';
    this.selectedRating = null;
    document.querySelectorAll('#book-rating .star').forEach(star => {
      star.style.opacity = '0.3';
    });
  }
}