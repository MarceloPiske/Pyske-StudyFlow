import { BadgeRenderer } from '../components/badge-renderer.js';
import { FormBuilder } from '../components/form-builder.js';
import { UIUtils } from '../utils/ui-utils.js';
import { DateUtils } from '../utils/date-utils.js';
import { ResourcesManager } from './ResourcesManager.js';
import { FocusSessionUI } from './FocusSessionUI.js';

export class TopicsModule {
  constructor() {
    this.topics = [];
    this.resourcesManager = new ResourcesManager();
    this.focusSessionUI = new FocusSessionUI(this.resourcesManager);
  }

  async renderListView(topicsData) {
    this.topics = topicsData || [];
    
    return `
      <div class="topics-container">
        <div class="topics-header">
          <h1>Gestão de Tópicos</h1>
          <div class="topics-controls">
            <div class="topics-filters">
              <button class="filter-btn active" data-filter="all">Todos</button>
              <button class="filter-btn" data-filter="status-not-started">Não Iniciados</button>
              <button class="filter-btn" data-filter="status-in-progress">Em Andamento</button>
              <button class="filter-btn" data-filter="status-completed">Concluídos</button>
              <button class="filter-btn" data-filter="priority-high">Alta Prioridade</button>
            </div>
            <button id="add-topic-btn" class="btn btn-primary">
              <span class="material-icons">add</span> Novo Tópico
            </button>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Árvore de Conhecimento</h3>
            </div>
            <div class="card-body">
              <div id="topics-tree" class="topics-tree">
                ${this.renderTopicsTree()}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Adicionar/Editar Tópico</h3>
            </div>
            <div class="card-body">
              ${this.renderTopicForm()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async renderDetailView(topicId, firestoreService) {
    const topic = window.app.allTopics.find(t => t.id === topicId);
    if (!topic) {
      return '<div class="card"><div class="card-body"><h2>Tópico não encontrado</h2></div></div>';
    }

    // Load related data
    const [resources, books, sessions] = await Promise.all([
      firestoreService.getTopicResources(topicId),
      firestoreService.getTopicBooks(topicId),
      firestoreService.getTopicSessions(topicId)
    ]);

    return `
      <div class="topic-detail-container">
        <div class="detail-header">
          <div class="detail-title">
            <button class="btn btn-ghost btn-sm" onclick="window.app.navigateToSection('topics')">
              <span class="material-icons">arrow_back</span> Voltar
            </button>
            <h1>${topic.name}</h1>
            <div class="topic-meta">
              ${BadgeRenderer.renderStatusBadge(topic.status)}
              ${BadgeRenderer.renderPriorityBadge(topic.priority)}
              ${BadgeRenderer.renderProficiencyBadge(topic.proficiency)}
              ${BadgeRenderer.renderDueDateBadge(topic.dueDate)}
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-secondary btn-edit-topic" data-topic-id="${topic.id}">
              <span class="material-icons">edit</span> Editar
            </button>
            <button class="study-action-btn" data-topic-id="${topic.id}" data-topic-name="${topic.name}">
              <span class="material-icons">school</span> Iniciar Estudo
            </button>
          </div>
        </div>

        <div class="topic-tabs">
          <div class="tab-nav">
            <button class="tab-btn active" data-tab="overview">Visão Geral</button>
            <button class="tab-btn" data-tab="resources">Recursos</button>
            <button class="tab-btn" data-tab="books">Livros</button>
            <button class="tab-btn" data-tab="focus">Sessão de Foco</button>
          </div>

          <div class="tab-content">
            <div class="tab-pane active" id="overview-tab">
              ${this.renderOverviewTab(topic, resources, books, sessions)}
            </div>
            <div class="tab-pane" id="resources-tab">
              ${this.resourcesManager.render(topic, resources)}
            </div>
            <div class="tab-pane" id="books-tab">
              ${this.renderBooksTab(topic, books)}
            </div>
            <div class="tab-pane" id="focus-tab">
              ${this.focusSessionUI.render(topic)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTopicForm() {
    return `
      <form id="topic-form" class="topic-form">
        <input type="hidden" id="topic-id">
        
        <div class="form-group">
          <label class="form-label">Nome do Tópico</label>
          <input type="text" id="topic-name" class="form-input" placeholder="Ex: Teologia Sistemática" required>
        </div>

        <div class="form-group">
          <label class="form-label">Tópico Pai (Opcional)</label>
          <select id="topic-parent" class="form-input">
            ${FormBuilder.renderSelectOptions(
              this.topics.filter(topic => !topic.parentId), 
              'id', 
              'name', 
              'Tópico Principal'
            )}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nível de Proficiência</label>
            <select id="topic-proficiency" class="form-input">
              <option value="Iniciante">Iniciante</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Avançado">Avançado</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="topic-status" class="form-input">
              <option value="Não Iniciado">Não Iniciado</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select id="topic-priority" class="form-input">
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data Limite (Opcional)</label>
            <input type="date" id="topic-due-date" class="form-input">
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Salvar</button>
          <button type="button" id="cancel-topic" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;
  }

  renderOverviewTab(topic, resources, books, sessions) {
    const totalStudyTime = sessions.reduce((total, session) => total + (session.durationInSeconds || 0), 0);
    const totalHours = Math.floor(totalStudyTime / 3600);
    const totalMinutes = Math.floor((totalStudyTime % 3600) / 60);

    return `
      <div class="overview-grid">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Estatísticas de Estudo</h3>
          </div>
          <div class="card-body">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">${totalHours}h ${totalMinutes}m</span>
                <span class="stat-label">Tempo Total</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${sessions.length}</span>
                <span class="stat-label">Sessões</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${resources.length}</span>
                <span class="stat-label">Recursos</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${books.length}</span>
                <span class="stat-label">Livros</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Resumo do Tópico</h3>
          </div>
          <div class="card-body">
            <textarea id="topic-summary" class="form-input" rows="6" placeholder="Escreva um resumo das suas principais ideias sobre ${topic.name}...">${topic.summary || ''}</textarea>
            <button id="save-summary-btn" class="btn btn-primary btn-sm mt-2" data-topic-id="${topic.id}">
              <span class="material-icons">save</span> Salvar Resumo
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Atividade Recente</h3>
          </div>
          <div class="card-body">
            <div class="activity-list">
              ${sessions.slice(0, 5).map(session => `
                <div class="activity-item">
                  <div class="activity-icon"><span class="material-icons">school</span></div>
                  <div class="activity-content">
                    <div class="activity-title">Sessão de estudo - ${Math.floor((session.durationInSeconds || 0) / 60)}min</div>
                    <div class="activity-time">${DateUtils.formatDateTime(session.createdAt)}</div>
                  </div>
                </div>
              `).join('')}
              ${sessions.length === 0 ? '<p class="empty-state">Nenhuma sessão registrada ainda.</p>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderBooksTab(topic, books) {
    return `
      <div class="books-container">
        <div class="books-header">
          <h3>Livros Relacionados</h3>
          <button class="btn btn-secondary" onclick="window.app.navigateToSection('books')">
            <span class="material-icons">library_books</span> Gerenciar Livros
          </button>
        </div>
        <div class="grid grid-3">
          ${books.length ? books.map(book => this.renderBookCard(book)).join('') : '<div class="empty-state">Nenhum livro relacionado.</div>'}
        </div>
      </div>
    `;
  }

  renderBookCard(book) {
    return `
      <div class="card book-card" onclick="window.app.navigateToSection('books', { detailId: '${book.id}' })">
        <div class="book-cover">
          <img src="${book.coverUrl || '/placeholder-book.png'}" alt="${book.title}">
        </div>
        <div class="card-body">
          <h4 class="book-title">${book.title}</h4>
          <p class="book-author">${book.author}</p>
        </div>
      </div>
    `;
  }

  renderTopicsTree() {
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    return this.buildTreeHTML(rootTopics);
  }

  buildTreeHTML(topics, level = 0) {
    if (!topics.length) return '<p class="empty-state">Nenhum tópico criado ainda.</p>';

    return `
      <ul class="tree-list" style="margin-left: ${level * 20}px;">
        ${topics.map(topic => `
          <li class="tree-item">
            <div class="topic-item" data-topic-id="${topic.id}" draggable="true">
              <div class="topic-content">
                <span class="topic-name" data-topic-id="${topic.id}">${topic.name}</span>
                <div class="topic-badges">
                  ${BadgeRenderer.renderStatusBadge(topic.status)}
                  ${BadgeRenderer.renderPriorityBadge(topic.priority)}
                  ${BadgeRenderer.renderProficiencyBadge(topic.proficiency)}
                  ${BadgeRenderer.renderDueDateBadge(topic.dueDate)}
                </div>
              </div>
              <div class="topic-actions">
                <button class="btn-edit" data-topic-id="${topic.id}"><span class="material-icons small">edit</span></button>
                <button class="btn-delete" data-topic-id="${topic.id}"><span class="material-icons small">delete</span></button>
                <button class="btn-study" data-topic-id="${topic.id}" data-topic-name="${topic.name}"><span class="material-icons small">school</span></button>
              </div>
            </div>
            ${this.buildTreeHTML(this.getChildTopics(topic.id), level + 1)}
          </li>
        `).join('')}
      </ul>
    `;
  }

  getChildTopics(parentId) {
    return this.topics.filter(topic => topic.parentId === parentId);
  }

  initListViewListeners(firestoreService) {
    this.setupEventListeners(firestoreService);
    this.setupFilters();
  }

  initDetailViewListeners(firestoreService) {
    this.setupTabNavigation();
    this.resourcesManager.setupListeners(firestoreService);
    this.focusSessionUI.setupListeners();
    this.setupOverviewActions(firestoreService);
  }

  setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const filter = e.target.dataset.filter;
        this.applyFilter(filter);
      });
    });
  }

  applyFilter(filter) {
    const topics = document.querySelectorAll('.topic-item');
    
    topics.forEach(topicEl => {
      const topicId = topicEl.dataset.topicId;
      const topic = this.topics.find(t => t.id === topicId);
      let show = true;
      
      switch (filter) {
        case 'status-not-started':
          show = topic.status === 'Não Iniciado';
          break;
        case 'status-in-progress':
          show = topic.status === 'Em Andamento';
          break;
        case 'status-completed':
          show = topic.status === 'Concluído';
          break;
        case 'priority-high':
          show = topic.priority === 'Alta';
          break;
        case 'all':
        default:
          show = true;
      }
      
      topicEl.closest('.tree-item').style.display = show ? 'block' : 'none';
    });
  }

  setupEventListeners(firestoreService) {
    // Add topic button
    document.getElementById('add-topic-btn')?.addEventListener('click', () => {
      this.clearForm();
    });

    // Form submission
    document.getElementById('topic-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit(firestoreService);
    });

    // Cancel button
    document.getElementById('cancel-topic')?.addEventListener('click', () => {
      this.clearForm();
    });

    // Tree actions
    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');
      const studyBtn = e.target.closest('.btn-study');
      const topicNameEl = e.target.closest('.topic-name');

      if (editBtn) {
        const topicId = editBtn.dataset.topicId;
        this.editTopic(topicId);
      } else if (deleteBtn) {
        const topicId = deleteBtn.dataset.topicId;
        this.deleteTopic(topicId, firestoreService);
      } else if (studyBtn) {
        const topicId = studyBtn.dataset.topicId;
        const topicName = studyBtn.dataset.topicName;
        window.app.startStudySession(topicId, topicName);
      } else if (topicNameEl) {
        const topicId = topicNameEl.dataset.topicId;
        window.app.navigateToSection('topics', { detailId: topicId });
      }
    });
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
    document.getElementById('save-summary-btn')?.addEventListener('click', (e) => {
      const topicId = e.target.dataset.topicId;
      const summary = document.getElementById('topic-summary').value;
      this.saveTopicSummary(topicId, summary, firestoreService);
    });

    document.querySelector('.btn-edit-topic')?.addEventListener('click', (e) => {
      const topicId = e.target.dataset.topicId;
      // Switch to list view and open edit form
      window.app.navigateToSection('topics').then(() => {
        // Add slight delay to ensure DOM is ready
        setTimeout(() => {
          const module = window.app.modules.topics;
          module.editTopic(topicId);
        }, 100);
      });
    });
  }

  async handleFormSubmit(firestoreService) {
    const formData = FormBuilder.getFormData('topic-form');
    const topicId = document.getElementById('topic-id').value;

    if (!formData['topic-name']?.trim()) return;

    try {
      const topicData = {
        name: formData['topic-name'].trim(),
        parentId: formData['topic-parent'] || null,
        proficiency: formData['topic-proficiency'],
        status: formData['topic-status'],
        priority: formData['topic-priority'],
        dueDate: formData['topic-due-date'] ? new Date(formData['topic-due-date']) : null
      };

      if (topicId) {
        await firestoreService.updateDocument('topics', topicId, topicData);
      } else {
        await firestoreService.createDocument('topics', topicData);
      }

      // Refresh central data and reload topics
      await window.app.refreshData('topics');
      window.app.navigateToSection('topics');
    } catch (error) {
      console.error('Error saving topic:', error);
    }
  }

  editTopic(topicId) {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return;

    const formData = {
      'topic-id': topic.id,
      'topic-name': topic.name,
      'topic-parent': topic.parentId || '',
      'topic-proficiency': topic.proficiency || 'Iniciante',
      'topic-status': topic.status || 'Não Iniciado',
      'topic-priority': topic.priority || 'Média',
      'topic-due-date': topic.dueDate ? DateUtils.formatTimeISO(topic.dueDate) : ''
    };

    FormBuilder.populateForm('topic-form', formData);
  }

  async deleteTopic(topicId, firestoreService) {
    if (!confirm('Tem certeza que deseja excluir este tópico?')) return;

    try {
      await firestoreService.deleteDocument('topics', topicId);
      // Refresh central data and reload topics
      await window.app.refreshData('topics');
      window.app.navigateToSection('topics');
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  }

  clearForm() {
    UIUtils.clearForm('topic-form');
  }

  async saveTopicSummary(topicId, summary, firestoreService) {
    try {
      await firestoreService.updateDocument('topics', topicId, { summary });
      // Update central data
      const topic = window.app.allTopics.find(t => t.id === topicId);
      if (topic) topic.summary = summary;
      alert('Resumo salvo com sucesso!');
    } catch (error) {
      console.error('Error saving summary:', error);
      alert('Erro ao salvar resumo.');
    }
  }
}