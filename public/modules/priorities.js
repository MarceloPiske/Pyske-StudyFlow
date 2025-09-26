import { BadgeRenderer } from '../components/badge-renderer.js';
import { UIUtils } from '../utils/ui-utils.js';

export class PrioritiesModule {
  constructor() {
    // No longer needs db or user - receives data from app.js
    this.topics = [];
    this.priorityQueueIds = [];
    this.priorityQueueTopics = [];
  }

  // Main render method - receives all needed data from app.js
  async render(allTopics, priorityQueueTopics, priorityQueueIds) {
    this.topics = allTopics;
    this.priorityQueueTopics = priorityQueueTopics;
    this.priorityQueueIds = priorityQueueIds;

    return `
      <div class="priorities-container">
        <div class="priorities-header">
          <h1>Plano de Estudo</h1>
          <p>Organize seus tópicos por ordem de prioridade e crie seu roteiro de estudos</p>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><span class="material-icons">account_tree</span> Sua Árvore de Conhecimento</h3>
              <p class="card-subtitle">Arraste os tópicos para a fila de prioridades</p>
            </div>
            <div class="card-body">
              <div class="topics-filters-mini">
                <button class="mini-filter-btn active" data-filter="all">Todos</button>
                <button class="mini-filter-btn" data-filter="not-in-queue">Não Priorizados</button>
                <button class="mini-filter-btn" data-filter="high-priority">Alta Prioridade</button>
              </div>
              <div id="topics-tree-source" class="topics-tree-source">
                ${this.renderTopicsTree()}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><span class="material-icons">format_list_numbered</span> Sua Fila de Prioridades</h3>
              <p class="card-subtitle">Ordem de estudo planejada</p>
            </div>
            <div class="card-body">
              <div class="priority-queue-header">
                <div class="queue-stats">
                  <span class="stat"><span class="material-icons small">checklist</span> ${this.priorityQueueIds.length} tópicos na fila</span>
                  <span class="stat"><span class="material-icons small">schedule</span> ~${this.estimateStudyTime()} horas estimadas</span>
                </div>
                <button id="clear-queue-btn" class="btn btn-ghost btn-sm"><span class="material-icons">delete</span> Limpar Fila</button>
              </div>
              <div id="priority-queue" class="priority-queue" data-drop-zone="priority-queue">
                ${this.renderPriorityQueue()}
              </div>
              <div class="queue-actions">
                <button id="save-priorities-btn" class="btn btn-primary"><span class="material-icons">save</span> Salvar Prioridades</button>
                <button id="start-next-study-btn" class="btn btn-success" ${this.priorityQueueIds.length ? '' : 'disabled'}>
                  <span class="material-icons">rocket_launch</span> Estudar Próximo da Fila
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="priorities-insights">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><span class="material-icons">lightbulb</span> Insights do Seu Plano</h3>
            </div>
            <div class="card-body">
              <div class="insights-grid">
                ${this.renderInsights()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTopicsTree() {
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    return this.buildTreeHTML(rootTopics);
  }

  buildTreeHTML(topics, level = 0) {
    if (!topics.length) return '<p class="empty-state">Nenhum tópico disponível.</p>';

    return `
      <ul class="tree-list" style="margin-left: ${level * 15}px;">
        ${topics.map(topic => {
          const isInQueue = this.priorityQueueIds.includes(topic.id);
          return `
            <li class="tree-item">
              <div class="topic-item draggable-topic ${isInQueue ? 'in-queue' : ''}" 
                   data-topic-id="${topic.id}" 
                   draggable="true">
                <div class="topic-content">
                  <span class="topic-name">${topic.name}</span>
                  <div class="topic-badges">
                    ${BadgeRenderer.renderStatusBadge(topic.status)}
                    ${BadgeRenderer.renderPriorityBadge(topic.priority)}
                    ${isInQueue ? '<span class="topic-badge in-queue"><span class="material-icons small">center_focus_strong</span> Na Fila</span>' : ''}
                  </div>
                </div>
              </div>
              ${this.buildTreeHTML(this.getChildTopics(topic.id), level + 1)}
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }

  getChildTopics(parentId) {
    return this.topics.filter(topic => topic.parentId === parentId);
  }

  renderPriorityQueue() {
    if (!this.priorityQueueIds.length) {
      return `
        <div class="empty-queue">
          <p><span class="material-icons">center_focus_strong</span> Sua fila de prioridades está vazia</p>
          <p>Arraste tópicos da árvore ao lado para começar a organizar seus estudos</p>
        </div>
      `;
    }

    return this.priorityQueueIds.map((topicId, index) => {
      const topic = this.topics.find(t => t.id === topicId);
      if (!topic) return '';

      return `
        <div class="queue-item" data-topic-id="${topicId}" data-queue-index="${index}">
          <div class="queue-position">#${index + 1}</div>
          <div class="queue-topic-content">
            <div class="queue-topic-name">${topic.name}</div>
            <div class="queue-topic-meta">
              ${BadgeRenderer.renderStatusBadge(topic.status)}
              ${BadgeRenderer.renderPriorityBadge(topic.priority)}
              ${BadgeRenderer.renderDueDateBadge(topic.dueDate)}
            </div>
          </div>
          <div class="queue-actions">
            <button class="btn-queue-up" data-topic-id="${topicId}" ${index === 0 ? 'disabled' : ''}><span class="material-icons small">keyboard_arrow_up</span></button>
            <button class="btn-queue-down" data-topic-id="${topicId}" ${index === this.priorityQueueIds.length - 1 ? 'disabled' : ''}><span class="material-icons small">keyboard_arrow_down</span></button>
            <button class="btn-queue-remove" data-topic-id="${topicId}"><span class="material-icons small">close</span></button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderInsights() {
    const insights = this.generateInsights();

    return insights.map(insight => `
      <div class="insight-card ${insight.type}">
        <div class="insight-icon">${insight.icon}</div>
        <div class="insight-content">
          <div class="insight-title">${insight.title}</div>
          <div class="insight-text">${insight.text}</div>
          ${insight.action ? `<button class="insight-action btn btn-sm" data-action="${insight.action.type}" data-topic-id="${insight.action.topicId}">${insight.action.text}</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  generateInsights() {
    const insights = [];

    // Insight about high priorities not in queue
    const highPriorityNotInQueue = this.topics.filter(t => 
      t.priority === 'Alta' && !this.priorityQueueIds.includes(t.id)
    );

    if (highPriorityNotInQueue.length > 0) {
      insights.push({
        type: 'warning',
        icon: '<span class="material-icons">local_fire_department</span>',
        title: 'Prioridades Altas Não Organizadas',
        text: `Você tem ${highPriorityNotInQueue.length} tópico(s) de alta prioridade que não estão na sua fila de estudos.`,
        action: {
          type: 'add-high-priority',
          text: 'Adicionar à Fila'
        }
      });
    }

    // Positive insight
    if (this.priorityQueueIds.length >= 5) {
      insights.push({
        type: 'success',
        icon: '<span class="material-icons">center_focus_strong</span>',
        title: 'Planejamento Excelente!',
        text: `Parabéns! Você tem um plano bem estruturado com ${this.priorityQueueIds.length} tópicos organizados.`
      });
    }

    return insights;
  }

  estimateStudyTime() {
    // Simple estimate: 2-4 hours per topic based on proficiency
    return this.priorityQueueIds.reduce((total, topicId) => {
      const topic = this.topics.find(t => t.id === topicId);
      if (!topic) return total;

      const estimates = {
        'Iniciante': 4,
        'Intermediário': 3,
        'Avançado': 2,
        'Expert': 1
      };

      return total + (estimates[topic.proficiency] || 3);
    }, 0);
  }

  init() {
    this.setupEventListeners();
    this.setupDragAndDrop();
  }

  setupEventListeners() {
    // Mini filters
    document.querySelectorAll('.mini-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mini-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.applyMiniFilter(e.target.dataset.filter);
      });
    });

    // Queue actions
    document.getElementById('save-priorities-btn')?.addEventListener('click', () => {
      this.savePriorityQueue();
    });

    document.getElementById('clear-queue-btn')?.addEventListener('click', () => {
      this.clearQueue();
    });

    document.getElementById('start-next-study-btn')?.addEventListener('click', () => {
      this.startNextStudy();
    });

    // Queue item actions (delegate)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-queue-up')) {
        this.moveTopicUp(e.target.dataset.topicId);
      } else if (e.target.classList.contains('btn-queue-down')) {
        this.moveTopicDown(e.target.dataset.topicId);
      } else if (e.target.classList.contains('btn-queue-remove')) {
        this.removeFromQueue(e.target.dataset.topicId);
      } else if (e.target.classList.contains('insight-action')) {
        this.handleInsightAction(e.target.dataset.action);
      }
    });
  }

  setupDragAndDrop() {
    // Make topics draggable
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-topic')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.topicId);
        e.target.classList.add('dragging');
      }
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('draggable-topic')) {
        e.target.classList.remove('dragging');
      }
    });

    // Make priority queue droppable
    const queueEl = document.getElementById('priority-queue');
    if (queueEl) {
      queueEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        queueEl.classList.add('drag-over');
      });

      queueEl.addEventListener('dragleave', (e) => {
        if (!queueEl.contains(e.relatedTarget)) {
          queueEl.classList.remove('drag-over');
        }
      });

      queueEl.addEventListener('drop', (e) => {
        e.preventDefault();
        queueEl.classList.remove('drag-over');

        const topicId = e.dataTransfer.getData('text/plain');
        this.addToQueue(topicId);
      });
    }
  }

  applyMiniFilter(filter) {
    const topicElements = document.querySelectorAll('.draggable-topic');

    topicElements.forEach(el => {
      const topicId = el.dataset.topicId;
      const topic = this.topics.find(t => t.id === topicId);
      let show = true;

      switch (filter) {
        case 'not-in-queue':
          show = !this.priorityQueueIds.includes(topicId);
          break;
        case 'high-priority':
          show = topic.priority === 'Alta';
          break;
        case 'all':
        default:
          show = true;
      }

      el.closest('.tree-item').style.display = show ? 'block' : 'none';
    });
  }

  addToQueue(topicId) {
    if (this.priorityQueueIds.includes(topicId)) {
      alert('Este tópico já está na fila de prioridades!');
      return;
    }

    this.priorityQueueIds.push(topicId);
    this.refreshQueueDisplay();
  }

  removeFromQueue(topicId) {
    const index = this.priorityQueueIds.indexOf(topicId);
    if (index > -1) {
      this.priorityQueueIds.splice(index, 1);
      this.refreshQueueDisplay();
    }
  }

  moveTopicUp(topicId) {
    const index = this.priorityQueueIds.indexOf(topicId);
    if (index > 0) {
      [this.priorityQueueIds[index], this.priorityQueueIds[index - 1]] = 
      [this.priorityQueueIds[index - 1], this.priorityQueueIds[index]];
      this.refreshQueueDisplay();
    }
  }

  moveTopicDown(topicId) {
    const index = this.priorityQueueIds.indexOf(topicId);
    if (index < this.priorityQueueIds.length - 1) {
      [this.priorityQueueIds[index], this.priorityQueueIds[index + 1]] = 
      [this.priorityQueueIds[index + 1], this.priorityQueueIds[index]];
      this.refreshQueueDisplay();
    }
  }

  clearQueue() {
    if (confirm('Tem certeza que deseja limpar toda a fila de prioridades?')) {
      this.priorityQueueIds = [];
      this.refreshQueueDisplay();
    }
  }

  refreshQueueDisplay() {
    // Update priority queue display
    UIUtils.updateElementHTML('priority-queue', this.renderPriorityQueue());

    // Update queue stats
    document.querySelector('.queue-stats').innerHTML = `
      <span class="stat"><span class="material-icons small">checklist</span> ${this.priorityQueueIds.length} tópicos na fila</span>
      <span class="stat"><span class="material-icons small">schedule</span> ~${this.estimateStudyTime()} horas estimadas</span>
    `;

    // Update start button
    const startBtn = document.getElementById('start-next-study-btn');
    startBtn.disabled = this.priorityQueueIds.length === 0;

    // Update tree to show which topics are in queue
    UIUtils.updateElementHTML('topics-tree-source', this.renderTopicsTree());

    // Reapply current filter
    const activeFilter = document.querySelector('.mini-filter-btn.active')?.dataset.filter || 'all';
    this.applyMiniFilter(activeFilter);

    // Update insights
    document.querySelector('.insights-grid').innerHTML = this.renderInsights();
  }

  async savePriorityQueue() {
    try {
      // Use centralized method from app.js
      await window.app.updatePriorityQueue(this.priorityQueueIds);
      alert('Prioridades salvas com sucesso! 💾');
    } catch (error) {
      console.error('Error saving priorities:', error);
      alert('Erro ao salvar prioridades. Tente novamente.');
    }
  }

  startNextStudy() {
    if (this.priorityQueueIds.length === 0) return;

    const nextTopicId = this.priorityQueueIds[0];
    const nextTopic = this.topics.find(t => t.id === nextTopicId);

    if (nextTopic) {
      if (confirm(`Iniciar sessão de estudo para "${nextTopic.name}"?`)) {
        window.app.startStudySession(nextTopicId, nextTopic.name);
      }
    }
  }

  handleInsightAction(action) {
    switch (action) {
      case 'add-high-priority':
        const highPriorityTopics = this.topics.filter(t => 
          t.priority === 'Alta' && !this.priorityQueueIds.includes(t.id)
        );
        highPriorityTopics.forEach(topic => this.addToQueue(topic.id));
        this.refreshQueueDisplay();
        break;
    }
  }
}