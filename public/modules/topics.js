import { BadgeRenderer } from '../components/badge-renderer.js';
import { TopicDetailView } from './topic-detail-view.js';
import { TopicForm } from './topic-form.js';

export class TopicsModule {
  constructor() {
    this.topics = [];
    this.detailView = new TopicDetailView();
    this.topicForm = null;
    this.draggedTopic = null;
  }

  async renderListView(topicsData) {
    this.topics = topicsData || [];
    this.topicForm = new TopicForm(this.topics);
    
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
              <p class="card-subtitle">Arraste os tópicos para reorganizar a hierarquia</p>
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
              ${this.topicForm.render()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async renderDetailView(topicId, firestoreService) {
    return await this.detailView.render(topicId, firestoreService);
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
            <div class="topic-item draggable-topic" 
                 data-topic-id="${topic.id}" 
                 draggable="true">
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
                <button class="btn-edit" data-topic-id="${topic.id}" title="Editar"><span class="material-icons small">edit</span></button>
                <button class="btn-delete" data-topic-id="${topic.id}" title="Excluir"><span class="material-icons small">delete</span></button>
                <button class="btn-study" data-topic-id="${topic.id}" data-topic-name="${topic.name}" title="Estudar"><span class="material-icons small">school</span></button>
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
    this.setupDragAndDrop(firestoreService);
    // Initialize form listeners with delay to ensure DOM is ready
    setTimeout(() => {
      this.topicForm.setupListeners(firestoreService);
    }, 100);
  }

  initDetailViewListeners(firestoreService) {
    this.detailView.setupListeners(firestoreService);
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
      this.topicForm.clear();
    });

    // Tree actions using event delegation
    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');
      const studyBtn = e.target.closest('.btn-study');
      const topicNameEl = e.target.closest('.topic-name');

      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        const topicId = editBtn.dataset.topicId;
        this.editTopic(topicId);
      } else if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const topicId = deleteBtn.dataset.topicId;
        this.deleteTopic(topicId, firestoreService);
      } else if (studyBtn) {
        e.preventDefault();
        e.stopPropagation();
        const topicId = studyBtn.dataset.topicId;
        const topicName = studyBtn.dataset.topicName;
        window.app.startStudySession(topicId, topicName);
      } else if (topicNameEl) {
        e.preventDefault();
        e.stopPropagation();
        const topicId = topicNameEl.dataset.topicId;
        window.app.navigateToSection('topics', { detailId: topicId });
      }
    });
  }

  setupDragAndDrop(firestoreService) {
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-topic')) {
        this.draggedTopic = e.target.dataset.topicId;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
      }
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('draggable-topic')) {
        e.target.classList.remove('dragging');
        this.draggedTopic = null;
      }
    });

    document.addEventListener('dragover', (e) => {
      const dropTarget = e.target.closest('.topic-item');
      if (dropTarget && !dropTarget.classList.contains('dragging')) {
        e.preventDefault();
        dropTarget.classList.add('drag-over');
      }
    });

    document.addEventListener('dragleave', (e) => {
      const dropTarget = e.target.closest('.topic-item');
      if (dropTarget) {
        dropTarget.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropTarget = e.target.closest('.topic-item');
      
      if (dropTarget && this.draggedTopic) {
        dropTarget.classList.remove('drag-over');
        const newParentId = dropTarget.dataset.topicId;
        
        if (this.draggedTopic !== newParentId) {
          this.changeTopicParent(this.draggedTopic, newParentId, firestoreService);
        }
      }
    });
  }

  async changeTopicParent(topicId, newParentId, firestoreService) {
    try {
      // Prevent circular references
      if (this.wouldCreateCircularReference(topicId, newParentId)) {
        alert('Não é possível criar uma referência circular. Um tópico filho não pode ser pai de seu próprio pai.');
        return;
      }

      await firestoreService.updateDocument('topics', topicId, {
        parentId: newParentId
      });

      // Refresh data and re-render
      await window.app.refreshData('topics');
      this.topics = window.app.allTopics;
      
      // Re-render tree
      const treeContainer = document.getElementById('topics-tree');
      if (treeContainer) {
        treeContainer.innerHTML = this.renderTopicsTree();
      }

      // Update form's parent selector
      this.topicForm.updateTopics(this.topics);

    } catch (error) {
      console.error('Error changing topic parent:', error);
      alert('Erro ao reorganizar tópico. Tente novamente.');
    }
  }

  wouldCreateCircularReference(topicId, newParentId) {
    // Check if newParentId is a descendant of topicId
    const checkDescendant = (parentId, targetId) => {
      const children = this.topics.filter(t => t.parentId === parentId);
      for (const child of children) {
        if (child.id === targetId || checkDescendant(child.id, targetId)) {
          return true;
        }
      }
      return false;
    };

    return checkDescendant(topicId, newParentId);
  }

  editTopic(topicId) {
    this.topicForm.edit(topicId);
  }

  async deleteTopic(topicId, firestoreService) {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return;

    // Check if topic has children
    const hasChildren = this.topics.some(t => t.parentId === topicId);
    
    let confirmMessage = `Tem certeza que deseja excluir o tópico "${topic.name}"?`;
    if (hasChildren) {
      confirmMessage += '\n\nEste tópico possui subtópicos. Eles serão movidos para o nível raiz.';
    }

    if (!confirm(confirmMessage)) return;

    try {
      // Move children to root level
      if (hasChildren) {
        const children = this.topics.filter(t => t.parentId === topicId);
        for (const child of children) {
          await firestoreService.updateDocument('topics', child.id, {
            parentId: null
          });
        }
      }

      // Delete the topic
      await firestoreService.deleteDocument('topics', topicId);
      
      // Refresh central data and reload topics
      await window.app.refreshData('topics');
      window.app.navigateToSection('topics');
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Erro ao excluir tópico. Tente novamente.');
    }
  }
}