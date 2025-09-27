import { TopicList } from './TopicList.js';
import { TopicForm } from './TopicForm.js';
import { TopicFilters } from './TopicFilters.js';
import { TopicDetailView } from './TopicDetailView.js';

export class TopicPage {
  constructor(props) {
    this.topics = props.topics || [];
    this.filteredTopics = this.topics;
    this.firestoreService = props.firestoreService;
    this.currentDetailId = props.detailId;
    this.element = null;

    // Create child components
    this.topicFilters = new TopicFilters({
      onFilterChange: (filter) => this.handleFilterChange(filter)
    });

    this.topicList = new TopicList({
      topics: this.filteredTopics,
      onEdit: (topicId) => this.handleEditTopic(topicId),
      onDelete: (topicId) => this.handleDeleteTopic(topicId),
      onStudy: (topicId, topicName) => this.handleStudyTopic(topicId, topicName),
      onNavigate: (topicId) => this.handleNavigateToDetail(topicId),
      onDragDrop: (topicId, newParentId) => this.handleDragDrop(topicId, newParentId)
    });

    this.topicForm = new TopicForm({
      topics: this.topics,
      onSave: () => this.handleFormSave(),
      onCancel: () => this.handleFormCancel()
    });

    if (this.currentDetailId) {
      this.detailView = new TopicDetailView({
        topicId: this.currentDetailId,
        firestoreService: this.firestoreService
      });
    }
  }

  render() {
    // If we have a detail ID, render detail view
    if (this.currentDetailId && this.detailView) {
      return this.detailView.render();
    }

    // Otherwise render list view
    return `
      <div class="topics-container">
        <div class="topics-header">
          <h1>Gestão de Tópicos</h1>
          <div class="topics-controls">
            <div id="topic-filters-container"></div>
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
              <div id="topics-tree" class="topics-tree"></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Adicionar/Editar Tópico</h3>
            </div>
            <div class="card-body">
              <div id="topic-form-container"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupListeners() {
    if (!this.element) return;

    // If detail view, setup its listeners
    if (this.detailView) {
      this.detailView.setupListeners();
      return;
    }

    // Setup child component listeners
    this.topicFilters.mount('#topic-filters-container');
    this.topicList.mount('#topics-tree');
    this.topicForm.mount('#topic-form-container');

    // Add topic button
    const addBtn = this.element.querySelector('#add-topic-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.topicForm.clear();
      });
    }
  }

  // Event Handlers
  handleFilterChange(filter) {
    this.filteredTopics = this.applyFilter(filter);
    this.topicList.updateTopics(this.filteredTopics);
  }

  applyFilter(filter) {
    switch (filter) {
      case 'status-not-started':
        return this.topics.filter(t => t.status === 'Não Iniciado');
      case 'status-in-progress':
        return this.topics.filter(t => t.status === 'Em Andamento');
      case 'status-completed':
        return this.topics.filter(t => t.status === 'Concluído');
      case 'priority-high':
        return this.topics.filter(t => t.priority === 'Alta');
      case 'all':
      default:
        return this.topics;
    }
  }

  handleEditTopic(topicId) {
    this.topicForm.edit(topicId);
  }

  async handleDeleteTopic(topicId) {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return;

    const hasChildren = this.topics.some(t => t.parentId === topicId);

    let confirmMessage = `Tem certeza que deseja excluir o tópico \"${topic.name}\"?`;
    if (hasChildren) {
      confirmMessage += '\\n\\nEste tópico possui subtópicos. Eles serão movidos para o nível raiz.';
    }

    if (!confirm(confirmMessage)) return;

    try {
      if (hasChildren) {
        const children = this.topics.filter(t => t.parentId === topicId);
        for (const child of children) {
          await this.firestoreService.updateDocument('topics', child.id, {
            parentId: null
          });
        }
      }

      await this.firestoreService.deleteDocument('topics', topicId);
      await window.app.refreshDataAndReRender('topics');
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Erro ao excluir tópico. Tente novamente.');
    }
  }

  handleStudyTopic(topicId, topicName) {
    window.app.startStudySession(topicId, topicName);
  }

  handleNavigateToDetail(topicId) {
    window.app.navigateToSection('topics', { detailId: topicId });
  }

  async handleDragDrop(topicId, newParentId) {
    try {
      if (this.wouldCreateCircularReference(topicId, newParentId)) {
        alert('Não é possível criar uma referência circular. Um tópico filho não pode ser pai de seu próprio pai.');
        return;
      }

      await this.firestoreService.updateDocument('topics', topicId, {
        parentId: newParentId
      });

      await window.app.refreshDataAndReRender('topics');
    } catch (error) {
      console.error('Error changing topic parent:', error);
      alert('Erro ao reorganizar tópico. Tente novamente.');
    }
  }

  wouldCreateCircularReference(topicId, newParentId) {
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

  handleFormSave() {
    // Form save is handled internally by TopicForm
    // This could trigger a refresh if needed
  }

  handleFormCancel() {
    // Form cancel is handled internally by TopicForm
  }

  mount(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (container) {
      container.innerHTML = this.render();
      this.element = container;
      this.setupListeners();
    }
  }

  updateTopics(topics) {
    this.topics = topics;
    this.filteredTopics = this.applyFilter(this.topicFilters?.activeFilter || 'all');

    // Update child components
    if (this.topicList) {
      this.topicList.updateTopics(this.filteredTopics);
    }
    if (this.topicForm) {
      this.topicForm.updateTopics(this.topics);
    }
  }
}