export class ArticlesModule {
  constructor() {
    this.articles = [];
    this.relatedTopics = [];
  }

  // Main render method for list view
  async render(topicsData = [], resourcesData = []) {
    this.relatedTopics = topicsData;
    this.articles = resourcesData.filter(r => 
      ['web_article', 'youtube_video', 'podcast', 'pdf_document'].includes(r.type)
    );

    return this.renderListView();
  }

  renderListView() {
    return `
      <div class="articles-container">
        <div class="articles-header">
          <h1>Artigos e Vídeos</h1>
          <button id="add-article-btn" class="btn btn-primary">
            <span class="material-icons">add</span> Adicionar Recurso
          </button>
        </div>

        <div class="articles-filters">
          <button class="filter-btn active" data-filter="all">Todos</button>
          <button class="filter-btn" data-filter="web_article">Artigos Web</button>
          <button class="filter-btn" data-filter="youtube_video">Vídeos</button>
          <button class="filter-btn" data-filter="podcast">Podcasts</button>
          <button class="filter-btn" data-filter="pdf_document">PDFs</button>
          <button class="filter-btn" data-filter="recent">Recentes</button>
          <button class="filter-btn" data-filter="favorite">Favoritos</button>
        </div>

        <div class="grid grid-3" id="articles-grid">
          ${this.renderArticles()}
        </div>

        <!-- Article Form Modal is now managed by ModalManager -->
      </div>
    `;
  }

  renderArticles(filter = 'all') {
    let filteredArticles = this.articles;

    switch (filter) {
      case 'recent':
        filteredArticles = this.articles.slice().sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 20);
        break;
      case 'favorite':
        filteredArticles = this.articles.filter(a => a.isFavorite);
        break;
      case 'all':
        break;
      default:
        filteredArticles = this.articles.filter(a => a.type === filter);
    }

    if (!filteredArticles.length) {
      return '<div class="empty-state">Nenhum recurso encontrado.</div>';
    }

    return filteredArticles.map(article => this.renderArticleCard(article)).join('');
  }

  renderArticleCard(article) {
    const typeIcons = {
      'web_article': 'article',
      'youtube_video': 'smart_display',
      'podcast': 'podcasts',
      'pdf_document': 'picture_as_pdf'
    };

    const typeLabels = {
      'web_article': 'Artigo',
      'youtube_video': 'Vídeo',
      'podcast': 'Podcast',
      'pdf_document': 'PDF'
    };

    // Extract thumbnail for YouTube videos
    let thumbnail = null;
    if (article.type === 'youtube_video' && article.content) {
      const videoId = this.extractYouTubeId(article.content);
      if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }

    return `
      <div class="card article-card" data-article-id="${article.id}" data-article-type="${article.type}">
        <div class="article-type-icon">
          <span class="material-icons">${typeIcons[article.type] || 'insert_drive_file'}</span>
        </div>
        
        <div class="article-thumbnail ${thumbnail ? '' : 'no-image'}">
          ${thumbnail ? 
            `<img src="${thumbnail}" alt="Thumbnail de ${article.title}" loading="lazy">` :
            `<span class="material-icons">${typeIcons[article.type] || 'insert_drive_file'}</span>`
          }
        </div>
        
        <div class="card-body">
          <div class="article-type-badge ${article.type}">${typeLabels[article.type]}</div>
          
          <h3 class="article-title">${article.title}</h3>
          
          ${article.source ? `<p class="article-source">Fonte: ${article.source}</p>` : ''}
          
          ${article.personal_summary ? `<p class="article-summary">${article.personal_summary.substring(0, 120)}${article.personal_summary.length > 120 ? '...' : ''}</p>` : ''}

          ${article.associatedTopicIds && article.associatedTopicIds.length ? `
            <div class="article-topics">
              <span class="topics-label">Tópicos:</span>
              ${article.associatedTopicIds.map(topicId => {
                const topic = this.getTopicById(topicId);
                return topic ? `<span class="topic-tag" data-topic-id="${topicId}">${topic.name}</span>` : ''
              }).filter(Boolean).join('')}
            </div>
          ` : ''}

          <div class="article-actions">
            <button class="btn-open" data-article-url="${article.content}">Abrir</button>
            <button class="btn-edit" data-article-id="${article.id}">Editar</button>
            <button class="btn-delete" data-article-id="${article.id}">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }

  extractYouTubeId(url) {
    const regExp = "/^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/";
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  getTopicById(topicId) {
    return this.relatedTopics?.find(t => t.id === topicId);
  }

  renderTopicsCheckboxes() {
    if (!this.relatedTopics?.length) {
      return '<p class="empty-state">Crie alguns tópicos primeiro para relacioná-los aos recursos.</p>';
    }

    const buildHierarchicalCheckboxes = (topics, level = 0) => {
      return topics.map(topic => {
        const children = this.relatedTopics.filter(t => t.parentId === topic.id);
        const indent = level * 20;
        
        return `
          <label class="topic-checkbox" style="margin-left: ${indent}px;">
            <input type="checkbox" value="${topic.id}" data-topic-name="${topic.name}">
            <span>${topic.name}</span>
          </label>
          ${children.length ? buildHierarchicalCheckboxes(children, level + 1) : ''}
        `;
      }).join('');
    };

    const rootTopics = this.relatedTopics.filter(t => !t.parentId);
    return buildHierarchicalCheckboxes(rootTopics);
  }

  // Initialize list view listeners
  initListViewListeners() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add article button
    document.getElementById('add-article-btn')?.addEventListener('click', () => {
      this.showArticleFormModal();
    });

    // Filter buttons
    document.querySelectorAll('.articles-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.articles-filters .filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const filter = e.target.dataset.filter;
        document.getElementById('articles-grid').innerHTML = this.renderArticles(filter);
      });
    });

    // Article actions
    document.addEventListener('click', (e) => {
      const openBtn = e.target.closest('.btn-open');
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');
      const topicTag = e.target.closest('.topic-tag');

      if (openBtn) {
        const url = openBtn.dataset.articleUrl;
        window.open(url, '_blank');
      } else if (editBtn) {
        const articleId = editBtn.dataset.articleId;
        this.showArticleFormModal(articleId);
      } else if (deleteBtn) {
        const articleId = deleteBtn.dataset.articleId;
        this.deleteArticle(articleId, window.app.firestoreService);
      } else if (topicTag) {
        const topicId = topicTag.dataset.topicId;
        window.app.navigateToSection('topics', { detailId: topicId });
      }
    });
  }

  showArticleFormModal(articleId = null) {
    const article = articleId ? this.articles.find(a => a.id === articleId) : null;
    const title = article ? 'Editar Recurso' : 'Adicionar Recurso';

    const content = `
      <form id="article-form">
        <input type="hidden" id="article-id" value="${article?.id || ''}">

        <div class="form-group">
          <label class="form-label">Tipo de Recurso</label>
          <select id="article-type" class="form-input">
            <option value="web_article" ${article?.type === 'web_article' ? 'selected' : ''}>Artigo Web</option>
            <option value="youtube_video" ${article?.type === 'youtube_video' ? 'selected' : ''}>Vídeo YouTube</option>
            <option value="podcast" ${article?.type === 'podcast' ? 'selected' : ''}>Podcast</option>
            <option value="pdf_document" ${article?.type === 'pdf_document' ? 'selected' : ''}>Documento PDF</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Título</label>
          <input type="text" id="article-title" class="form-input" value="${article?.title || ''}" required>
        </div>

        <div class="form-group">
          <label class="form-label">URL/Link</label>
          <input type="url" id="article-url" class="form-input" value="${article?.content || ''}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Fonte/Autor</label>
          <input type="text" id="article-source" class="form-input" placeholder="Ex: Stanford Encyclopedia, TED, etc." value="${article?.source || ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Resumo Pessoal</label>
          <textarea id="article-summary" class="form-input" rows="4" placeholder="Principais ideias, pontos importantes...">${article?.personal_summary || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Tópicos Relacionados</label>
          <div class="topics-selector" id="article-topics-selector">
            ${this.renderTopicsCheckboxes(article?.associatedTopicIds)}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="article-favorite" ${article?.isFavorite ? 'checked' : ''}> Marcar como favorito
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="btn-text">Salvar</span>
            <span class="btn-loading hidden">Salvando...</span>
          </button>
          <button type="button" id="cancel-article" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    window.app.modalManager.show({
      title,
      content,
      onMount: (modalElement) => {
        modalElement.querySelector('#article-form').addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleFormSubmit(modalElement);
        });

        modalElement.querySelector('#cancel-article').addEventListener('click', () => {
          window.app.modalManager.hide();
        });
      }
    });
  }

  async handleFormSubmit(modalElement) {
    const submitBtn = modalElement.querySelector('#article-form button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
      const firestoreService = window.app.firestoreService;
      const articleId = modalElement.querySelector('#article-id').value;
      const type = modalElement.querySelector('#article-type').value;
      const title = modalElement.querySelector('#article-title').value.trim();
      const url = modalElement.querySelector('#article-url').value.trim();
      const source = modalElement.querySelector('#article-source').value.trim();
      const summary = modalElement.querySelector('#article-summary').value.trim();
      const isFavorite = modalElement.querySelector('#article-favorite').checked;

      // Get selected topics
      const selectedTopics = [];
      modalElement.querySelectorAll('#article-topics-selector input[type="checkbox"]:checked').forEach(checkbox => {
        selectedTopics.push(checkbox.value);
      });

      if (!title || !url) {
        alert('Título e URL são obrigatórios.');
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        return;
      }

      const articleData = {
        title,
        type,
        content: url,
        source: source || null,
        personal_summary: summary || null,
        primaryTopicId: selectedTopics[0] || null,
        associatedTopicIds: selectedTopics,
        associatedBookIds: [],
        isFavorite
      };

      if (articleId) {
        await firestoreService.updateDocument('resources', articleId, articleData);
      } else {
        await firestoreService.createDocument('resources', articleData);
      }

      window.app.modalManager.hide();
      // Use new refresh method instead of full navigation
      await window.app.refreshDataAndReRender('articles');
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Erro ao salvar recurso. Tente novamente.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  async deleteArticle(articleId, firestoreService) {
    if (!confirm('Tem certeza que deseja excluir este recurso?')) return;

    try {
      await firestoreService.deleteDocument('resources', articleId);
      // Use new refresh method instead of full navigation
      await window.app.refreshDataAndReRender('articles');
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Erro ao excluir recurso. Tente novamente.');
    }
  }
}