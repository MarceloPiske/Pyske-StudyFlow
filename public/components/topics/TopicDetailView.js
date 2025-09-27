import { BadgeRenderer } from '../shared/badge-renderer.js';
import { DateUtils } from '../../utils/date-utils.js';
import { ResourcesManager } from '../../modules/ResourcesManager.js';
import { FocusSessionUI } from '../../modules/FocusSessionUI.js';

export class TopicDetailView {
  constructor(props) {
    this.topicId = props.topicId;
    this.firestoreService = props.firestoreService;
    this.element = null;
    this.resourcesManager = new ResourcesManager();
    this.focusSessionUI = new FocusSessionUI(this.resourcesManager);
  }

  async render() {
    const topic = window.app.allTopics.find(t => t.id === this.topicId);
    if (!topic) {
      return '<div class=\"card\"><div class=\"card-body\"><h2>Tópico não encontrado</h2></div></div>';
    }

    // Load related data
    const [resources, books, sessions] = await Promise.all([
      this.firestoreService.getTopicResources(this.topicId),
      this.firestoreService.getTopicBooks(this.topicId),
      this.firestoreService.getTopicSessions(this.topicId)
    ]);

    return `
      <div class=\"topic-detail-container\">
        <div class=\"detail-header\">
          <div class=\"detail-title\">
            <button class=\"btn btn-ghost btn-sm\" onclick=\"window.app.navigateToSection('topics')\">
              <span class=\"material-icons\">arrow_back</span> Voltar
            </button>
            <h1>${topic.name}</h1>
            <div class=\"topic-meta\">
              ${BadgeRenderer.renderStatusBadge(topic.status)}
              ${BadgeRenderer.renderPriorityBadge(topic.priority)}
              ${BadgeRenderer.renderProficiencyBadge(topic.proficiency)}
              ${BadgeRenderer.renderDueDateBadge(topic.dueDate)}
            </div>
          </div>
          <div class=\"detail-actions\">
            <button class=\"btn btn-secondary btn-edit-topic\" data-topic-id=\"${topic.id}\">
              <span class=\"material-icons\">edit</span> Editar
            </button>
            <button class=\"study-action-btn\" data-topic-id=\"${topic.id}\" data-topic-name=\"${topic.name}\">
              <span class=\"material-icons\">school</span> Iniciar Estudo
            </button>
          </div>
        </div>

        <div class=\"topic-tabs\">
          <div class=\"tab-nav\">
            <button class=\"tab-btn active\" data-tab=\"overview\">Visão Geral</button>
            <button class=\"tab-btn\" data-tab=\"resources\">Recursos</button>
            <button class=\"tab-btn\" data-tab=\"books\">Livros</button>
            <button class=\"tab-btn\" data-tab=\"focus\">Sessão de Foco</button>
          </div>

          <div class=\"tab-content\">
            <div class=\"tab-pane active\" id=\"overview-tab\">
              ${this.renderOverviewTab(topic, resources, books, sessions)}
            </div>
            <div class=\"tab-pane\" id=\"resources-tab\">
              ${this.resourcesManager.render(topic, resources)}
            </div>
            <div class=\"tab-pane\" id=\"books-tab\">
              ${this.renderBooksTab(topic, books)}
            </div>
            <div class=\"tab-pane\" id=\"focus-tab\">
              ${this.focusSessionUI.render(topic)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderOverviewTab(topic, resources, books, sessions) {
    const totalStudyTime = sessions.reduce((total, session) => total + (session.durationInSeconds || 0), 0);
    const totalHours = Math.floor(totalStudyTime / 3600);
    const totalMinutes = Math.floor((totalStudyTime % 3600) / 60);

    return `
      <div class=\"overview-grid\">
        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Estatísticas de Estudo</h3>
          </div>
          <div class=\"card-body\">
            <div class=\"stats-grid\">
              <div class=\"stat-item\">
                <span class=\"stat-value\">${totalHours}h ${totalMinutes}m</span>
                <span class=\"stat-label\">Tempo Total</span>
              </div>
              <div class=\"stat-item\">
                <span class=\"stat-value\">${sessions.length}</span>
                <span class=\"stat-label\">Sessões</span>
              </div>
              <div class=\"stat-item\">
                <span class=\"stat-value\">${resources.length}</span>
                <span class=\"stat-label\">Recursos</span>
              </div>
              <div class=\"stat-item\">
                <span class=\"stat-value\">${books.length}</span>
                <span class=\"stat-label\">Livros</span>
              </div>
            </div>
          </div>
        </div>

        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Resumo do Tópico</h3>
          </div>
          <div class=\"card-body\">
            <textarea id=\"topic-summary\" class=\"form-input\" rows=\"6\" placeholder=\"Escreva um resumo das suas principais ideias sobre ${topic.name}...\">${topic.summary || ''}</textarea>
            <button id=\"save-summary-btn\" class=\"btn btn-primary btn-sm mt-2\" data-topic-id=\"${topic.id}\">
              <span class=\"material-icons\">save</span> Salvar Resumo
            </button>
          </div>
        </div>

        <div class=\"card\">
          <div class=\"card-header\">
            <h3 class=\"card-title\">Atividade Recente</h3>
          </div>
          <div class=\"card-body\">
            <div class=\"activity-list\">
              ${sessions.slice(0, 5).map(session => `
                <div class=\"activity-item\">
                  <div class=\"activity-icon\"><span class=\"material-icons\">school</span></div>
                  <div class=\"activity-content\">
                    <div class=\"activity-title\">Sessão de estudo - ${Math.floor((session.durationInSeconds || 0) / 60)}min</div>
                    <div class=\"activity-time\">${DateUtils.formatDateTime(session.createdAt)}</div>
                  </div>
                </div>
              `).join('')}
              ${sessions.length === 0 ? '<p class=\"empty-state\">Nenhuma sessão registrada ainda.</p>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderBooksTab(topic, books) {
    return `
      <div class=\"books-container\">
        <div class=\"books-header\">
          <h3>Livros Relacionados</h3>
          <button class=\"btn btn-secondary\" onclick=\"window.app.navigateToSection('books')\">
            <span class=\"material-icons\">library_books</span> Gerenciar Livros
          </button>
        </div>
        <div class=\"grid grid-3\">
          ${books.length ? books.map(book => this.renderBookCard(book)).join('') : '<div class=\"empty-state\">Nenhum livro relacionado.</div>'}
        </div>
      </div>
    `;
  }

  renderBookCard(book) {
    return `
      <div class=\"card book-card\" onclick=\"window.app.navigateToSection('books', { detailId: '${book.id}' })\">
        <div class=\"book-cover\">
          <img src=\"${book.coverUrl || '/placeholder-book.png'}\" alt=\"${book.title}\">
        </div>
        <div class=\"card-body\">
          <h4 class=\"book-title\">${book.title}</h4>
          <p class=\"book-author\">${book.author}</p>
        </div>
      </div>
    `;
  }

  setupListeners() {
    this.setupTabNavigation();
    this.resourcesManager.setupListeners(this.firestoreService);
    this.focusSessionUI.setupListeners();
    this.setupOverviewActions();
  }

  setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.target.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });
  }

  setupOverviewActions() {
    document.getElementById('save-summary-btn')?.addEventListener('click', (e) => {
      const topicId = e.target.dataset.topicId;
      const summary = document.getElementById('topic-summary').value;
      this.saveTopicSummary(topicId, summary);
    });

    document.querySelector('.btn-edit-topic')?.addEventListener('click', (e) => {
      const topicId = e.target.dataset.topicId;
      window.app.navigateToSection('topics').then(() => {
        setTimeout(() => {
          const module = window.app.modules.topics;
          module.editTopic(topicId);
        }, 100);
      });
    });

    document.querySelectorAll('.study-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const topicId = e.currentTarget.dataset.topicId;
        const topicName = e.currentTarget.dataset.topicName;
        window.app.startStudySession(topicId, topicName);
      });
    });
  }

  async saveTopicSummary(topicId, summary) {
    try {
      await this.firestoreService.updateDocument('topics', topicId, { summary });
      const topic = window.app.allTopics.find(t => t.id === topicId);
      if (topic) topic.summary = summary;
      alert('Resumo salvo com sucesso!');
    } catch (error) {
      console.error('Error saving summary:', error);
      alert('Erro ao salvar resumo.');
    }
  }

  mount(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (container) {
      container.innerHTML = this.render();
      this.element = container;
      this.setupListeners();
    }
  }
}