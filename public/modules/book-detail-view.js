import { BadgeRenderer } from '../components/badge-renderer.js';
import { DateUtils } from '../utils/date-utils.js';

export class BookDetailView {
  async render(bookId, allTopics, firestoreService) {
    const book = window.app.allBooks.find(b => b.id === bookId);
    if (!book) {
      return '<div class=\"card\"><div class=\"card-body\"><h2>Livro não encontrado</h2></div></div>';
    }

    // Load related data
    const relatedTopics = allTopics.filter(topic => 
      book.relatedTopicIds && book.relatedTopicIds.includes(topic.id)
    );

    const sessions = await firestoreService.getCollection('studySessions');
    const bookSessions = sessions.filter(s => s.bookId === bookId);

    return `
      <div class=\"book-detail-container\">
        <div class=\"detail-header\">
          <div class=\"detail-title\">
            <button class=\"btn btn-ghost btn-sm\" onclick=\"window.app.navigateToSection('books')\">
              <span class=\"material-icons\">arrow_back</span> Voltar
            </button>
            <h1>${book.title}</h1>
            <p class=\"detail-subtitle\">por ${book.author}</p>
            <div class=\"book-meta\">
              ${this.renderBookStatus(book)}
              ${book.rating ? `<div class=\"book-rating\">${'⭐'.repeat(book.rating)}</div>` : ''}
            </div>
          </div>
          <div class=\"detail-actions\">
            <button class=\"btn btn-secondary btn-edit-book\" data-book-id=\"${book.id}\">
              <span class=\"material-icons\">edit</span> Editar
            </button>
            <button class=\"study-action-btn\" data-book-id=\"${book.id}\" data-book-title=\"${book.title}\">
              <span class=\"material-icons\">school</span> Estudar com este Livro
            </button>
          </div>
        </div>

        <div class=\"book-tabs\">
          <div class=\"tab-nav\">
            <button class=\"tab-btn active\" data-tab=\"overview\">Visão Geral</button>
            <button class=\"tab-btn\" data-tab=\"progress\">Progresso</button>
            <button class=\"tab-btn\" data-tab=\"notes\">Anotações</button>
            <button class=\"tab-btn\" data-tab=\"topics\">Tópicos Relacionados</button>
          </div>

          <div class=\"tab-content\">
            <div class=\"tab-pane active\" id=\"overview-tab\">
              ${this.renderOverviewTab(book, bookSessions)}
            </div>
            <div class=\"tab-pane\" id=\"progress-tab\">
              ${this.renderProgressTab(book)}
            </div>
            <div class=\"tab-pane\" id=\"notes-tab\">
              ${this.renderNotesTab(book)}
            </div>
            <div class=\"tab-pane\" id=\"topics-tab\">
              ${this.renderTopicsTab(book, relatedTopics)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderBookStatus(book) {
    const statusLabels = {
      'want-to-read': 'Quero Ler',
      'reading': 'Lendo',
      'read': 'Lido'
    };

    return `<div class=\"book-status ${book.status}\">${statusLabels[book.status] || 'Não definido'}</div>`;
  }

  renderOverviewTab(book, sessions) {
    const totalStudyTime = sessions.reduce((total, session) => total + (session.durationInSeconds || 0), 0);
    const totalHours = Math.floor(totalStudyTime / 3600);
    const totalMinutes = Math.floor((totalStudyTime % 3600) / 60);
    const progress = book.totalPages ? Math.round((book.currentPage || 0) / book.totalPages * 100) : 0;

    return `
      <div class=\"overview-grid\">
        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Estatísticas</h3>
          </div>
          <div class=\"card-body\">
            <div class=\"stats-grid\">
              <div class=\"stat-item\">
                <span class=\"stat-value\">${totalHours}h ${totalMinutes}m</span>
                <span class=\"stat-label\">Tempo de Estudo</span>
              </div>
              <div class=\"stat-item\">
                <span class=\"stat-value\">${sessions.length}</span>
                <span class=\"stat-label\">Sessões</span>
              </div>
              <div class=\"stat-item\">
                <span class=\"stat-value\">${progress}%</span>
                <span class=\"stat-label\">Progresso</span>
              </div>
              <div class=\"stat-item\">
                <span class=\"stat-value\">${book.currentPage || 0}/${book.totalPages || 0}</span>
                <span class=\"stat-label\">Páginas</span>
              </div>
            </div>
          </div>
        </div>

        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Detalhes do Livro</h3>
          </div>
          <div class=\"card-body\">
            ${book.coverUrl ? `
              <div class=\"book-cover-large\">
                <img src=\"${book.coverUrl}\" alt=\"Capa de ${book.title}\">
              </div>
            ` : ''}
            <div class=\"book-details\">
              <p><strong>Autor:</strong> ${book.author}</p>
              <p><strong>Status:</strong> ${this.renderBookStatus(book)}</p>
              ${book.totalPages ? `<p><strong>Total de Páginas:</strong> ${book.totalPages}</p>` : ''}
              ${book.rating ? `<p><strong>Avaliação:</strong> ${'⭐'.repeat(book.rating)}</p>` : ''}
            </div>
          </div>
        </div>

        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Sua Resenha</h3>
          </div>
          <div class=\"card-body\">
            <textarea id=\"book-review-text\" class=\"form-input\" rows=\"6\" placeholder=\"Escreva sua resenha pessoal deste livro...\">${book.review || ''}</textarea>
            <button id=\"save-review-btn\" class=\"btn btn-primary btn-sm mt-2\" data-book-id=\"${book.id}\">
              <span class=\"material-icons\">save</span> Salvar Resenha
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderProgressTab(book) {
    const progress = book.totalPages ? Math.round((book.currentPage || 0) / book.totalPages * 100) : 0;

    return `
      <div class=\"progress-container\">
        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Progresso de Leitura</h3>
          </div>
          <div class=\"card-body\">
            <div class=\"progress-visual\">
              <div class=\"progress-circle\">
                <div class=\"progress-percentage\">${progress}%</div>
              </div>
              <div class=\"progress-details\">
                <p><strong>Página Atual:</strong> ${book.currentPage || 0}</p>
                <p><strong>Total de Páginas:</strong> ${book.totalPages || 0}</p>
                <p><strong>Páginas Restantes:</strong> ${Math.max(0, (book.totalPages || 0) - (book.currentPage || 0))}</p>
              </div>
            </div>

            <div class=\"progress-update\">
              <h4>Atualizar Progresso</h4>
              <div class=\"form-group\">
                <label class=\"form-label\">Página Atual</label>
                <input type=\"number\" id=\"update-current-page\" class=\"form-input\" value=\"${book.currentPage || 0}\" min=\"0\" max=\"${book.totalPages || 1000}\">
              </div>
              <button id=\"update-progress-btn\" class=\"btn btn-primary\" data-book-id=\"${book.id}\">
                <span class=\"material-icons\">update</span> Atualizar Progresso
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderNotesTab(book) {
    return `
      <div class=\"notes-container\">
        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Anotações Pessoais</h3>
          </div>
          <div class=\"card-body\">
            <div class=\"notes-editor\">
              <textarea id=\"book-notes\" class=\"form-input\" rows=\"12\" placeholder=\"Faça suas anotações sobre ${book.title}...\">${book.personalNotes || ''}</textarea>
              <button id=\"save-notes-btn\" class=\"btn btn-primary\" data-book-id=\"${book.id}\">
                <span class=\"material-icons\">save</span> Salvar Anotações
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTopicsTab(book, relatedTopics) {
    return `
      <div class=\"related-topics-container\">
        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Tópicos Relacionados</h3>
            <button class=\"btn btn-secondary btn-sm\" data-book-id=\"${book.id}\" onclick=\"this.editBookTopics('${book.id}')\">
              <span class=\"material-icons\">edit</span> Editar Vínculos
            </button>
          </div>
          <div class=\"card-body\">
            ${relatedTopics.length ? `
              <div class=\"topics-grid\">
                ${relatedTopics.map(topic => `
                  <div class=\"topic-card\" onclick=\"window.app.navigateToSection('topics', { detailId: '${topic.id}' })\">
                    <h4>${topic.name}</h4>
                    <div class=\"topic-meta\">
                      ${BadgeRenderer.renderStatusBadge(topic.status)}
                      ${BadgeRenderer.renderPriorityBadge(topic.priority)}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p class=\"empty-state\">Nenhum tópico relacionado. Edite o livro para vincular tópicos.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  setupListeners(firestoreService) {
    this.setupTabNavigation();
    this.setupOverviewActions(firestoreService);
    this.setupProgressActions(firestoreService);
    this.setupNotesActions(firestoreService);
  }

  setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.target.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Update active tab pane
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });
  }

  setupOverviewActions(firestoreService) {
    document.getElementById('save-review-btn')?.addEventListener('click', (e) => {
      const bookId = e.target.dataset.bookId;
      const review = document.getElementById('book-review-text').value;
      this.saveBookReview(bookId, review, firestoreService);
    });

    document.querySelector('.btn-edit-book')?.addEventListener('click', (e) => {
      const bookId = e.target.dataset.bookId;
      // Navigate back to list view and trigger edit
      window.app.navigateToSection('books').then(() => {
        setTimeout(() => {
          const module = window.app.modules.books;
          module.editBook(bookId);
        }, 100);
      });
    });

    document.querySelectorAll('.study-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bookId = e.currentTarget.dataset.bookId;
        const bookTitle = e.currentTarget.dataset.bookTitle;

        const book = window.app.allBooks.find(b => b.id === bookId);
        if (book && book.relatedTopicIds && book.relatedTopicIds.length > 0) {
          const primaryTopicId = book.relatedTopicIds[0];
          const topic = window.app.allTopics.find(t => t.id === primaryTopicId);
          if (topic) {
            window.app.startStudySession(primaryTopicId, topic.name, bookId);
            return;
          }
        }

        // If no related topics, start a generic study session
        window.app.startStudySession(null, `Lendo: ${bookTitle}`, bookId);
      });
    });
  }

  setupProgressActions(firestoreService) {
    document.getElementById('update-progress-btn')?.addEventListener('click', (e) => {
      const bookId = e.target.dataset.bookId;
      const currentPage = parseInt(document.getElementById('update-current-page').value) || 0;
      this.updateBookProgress(bookId, currentPage, firestoreService);
    });
  }

  setupNotesActions(firestoreService) {
    document.getElementById('save-notes-btn')?.addEventListener('click', (e) => {
      const bookId = e.target.dataset.bookId;
      const notes = document.getElementById('book-notes').value;
      this.saveBookNotes(bookId, notes, firestoreService);
    });
  }

  async saveBookReview(bookId, review, firestoreService) {
    try {
      await firestoreService.updateDocument('books', bookId, { review });

      // Update central data
      const book = window.app.allBooks.find(b => b.id === bookId);
      if (book) book.review = review;

      alert('Resenha salva com sucesso!');
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Erro ao salvar resenha.');
    }
  }

  async updateBookProgress(bookId, currentPage, firestoreService) {
    try {
      await firestoreService.updateDocument('books', bookId, { currentPage });

      // Update central data
      const book = window.app.allBooks.find(b => b.id === bookId);
      if (book) book.currentPage = currentPage;

      // Refresh the current detail view
      window.app.refreshDataAndReRender('books');

      alert('Progresso atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Erro ao atualizar progresso.');
    }
  }

  async saveBookNotes(bookId, notes, firestoreService) {
    try {
      await firestoreService.updateDocument('books', bookId, { personalNotes: notes });

      // Update central data
      const book = window.app.allBooks.find(b => b.id === bookId);
      if (book) book.personalNotes = notes;

      alert('Anotações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar anotações.');
    }
  }
}