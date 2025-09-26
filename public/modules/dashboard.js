import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class DashboardModule {
  constructor() {
    // No longer needs db or user - receives data from app.js
    this.sessions = [];
    this.topics = [];
    this.books = [];
    this.focusData = {};
  }

  // Main method called by app.js - receives all data needed
  async render(topicsData, booksData, firestoreService) {
    this.topics = topicsData || [];
    this.books = booksData || [];
    
    // Load study sessions data
    await this.loadStudySessions(firestoreService);

    // Render main dashboard structure
    const dashboardHtml = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h1>Seu Centro de Comando</h1>
          <p>Análises e insights sobre sua jornada de conhecimento.</p>
        </div>
        <div class="dashboard-grid">
          ${this.renderWeeklyPulseWidget()}
          ${this.renderFocusDistributionWidget()}
          ${this.renderKnowledgeArsenalWidget()}
          ${this.renderProficiencyMapWidget()}
          ${this.renderPyskeSuggestionsWidget()}
        </div>
      </div>
    `;
    return dashboardHtml;
  }
  
  // Called after rendering to activate charts
  init() {
    this.initFocusDistributionChart();
  }

  async loadStudySessions(firestoreService) {
    try {
      this.sessions = await firestoreService.getCollection('studySessions', 'createdAt', 'desc');
      this.sessions = this.sessions.map(session => ({
        ...session,
        sessionDate: session.createdAt,
        durationMinutes: Math.round((session.durationInSeconds || 0) / 60)
      }));
    } catch (error) {
      console.error('Error loading study sessions:', error);
      this.sessions = [];
    }
  }

  renderWeeklyPulseWidget() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekSessions = this.sessions.filter(s => {
      const sessionDate = s.sessionDate?.toDate ? s.sessionDate.toDate() : new Date(s.sessionDate);
      return sessionDate > sevenDaysAgo;
    });
    
    const lastWeekSessions = this.sessions.filter(s => {
      const sessionDate = s.sessionDate?.toDate ? s.sessionDate.toDate() : new Date(s.sessionDate);
      return sessionDate <= sevenDaysAgo && sessionDate > fourteenDaysAgo;
    });

    const thisWeekMinutes = thisWeekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const lastWeekMinutes = lastWeekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    let percentageChange = 0;
    if (lastWeekMinutes > 0) {
      percentageChange = Math.round(((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100);
    } else if (thisWeekMinutes > 0) {
      percentageChange = 100;
    }
    
    const trendIcon = percentageChange >= 0 ? '<span class="material-icons">trending_up</span>' : '<span class="material-icons">trending_down</span>';
    const trendClass = percentageChange >= 0 ? 'trend-up' : 'trend-down';

    return `
      <div class="widget-card pulse-widget">
        <div class="card-header">
          <h3 class="card-title"><span class="material-icons">analytics</span> Pulso Semanal</h3>
        </div>
        <div class="card-body">
          <div class="pulse-stats">
            <div class="stat-item">
              <span class="stat-value">${(thisWeekMinutes / 60).toFixed(1)} horas</span>
              <span class="stat-label">Últimos 7 dias</span>
            </div>
            <div class="stat-item">
              <span class="stat-value ${trendClass}">${trendIcon} ${Math.abs(percentageChange)}%</span>
              <span class="stat-label">vs. semana anterior</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${thisWeekSessions.length}</span>
              <span class="stat-label">Sessões Concluídas</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Helper function to find root topic of any topic
  getTopicRoot(topicId) {
    let currentTopic = this.topics.find(t => t.id === topicId);
    if (!currentTopic) return null; // Topic may have been deleted
    
    while (currentTopic.parentId) {
      let parent = this.topics.find(t => t.id === currentTopic.parentId);
      if (!parent) break;
      currentTopic = parent;
    }
    return currentTopic;
  }

  renderFocusDistributionWidget() {
    this.focusData = {};

    this.sessions.forEach(session => {
      const rootTopic = this.getTopicRoot(session.topicId);
      if (rootTopic) {
        if (!this.focusData[rootTopic.name]) {
          this.focusData[rootTopic.name] = 0;
        }
        this.focusData[rootTopic.name] += (session.durationMinutes || 0);
      }
    });

    // Sort topics by study time
    const sortedTopics = Object.entries(this.focusData).sort((a, b) => b[1] - a[1]);

    const barsHtml = sortedTopics.slice(0, 8).map(([name, minutes]) => `
      <div class="bar-item">
        <span class="bar-label">${name}</span>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${sortedTopics.length > 0 ? (minutes / sortedTopics[0][1]) * 100 : 0}%;"></div>
        </div>
        <span class="bar-value">${(minutes / 60).toFixed(1)}h</span>
      </div>
    `).join('');

    return `
      <div class="widget-card focus-widget">
        <div class="card-header">
          <h3 class="card-title"><span class="material-icons">center_focus_strong</span> Distribuição de Foco</h3>
          <p class="card-subtitle">Onde seu tempo está sendo investido</p>
        </div>
        <div class="card-body">
          <div class="bar-chart">
            ${barsHtml.length > 0 ? barsHtml : '<p class="empty-state">Nenhum dado de estudo registrado.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  renderKnowledgeArsenalWidget() {
    const arsenalData = {};
    this.books.forEach(book => {
      book.relatedTopicIds?.forEach(topicId => {
        const rootTopic = this.getTopicRoot(topicId);
        if (rootTopic) {
          if (!arsenalData[rootTopic.name]) {
            arsenalData[rootTopic.name] = 0;
          }
          arsenalData[rootTopic.name]++;
        }
      });
    });

    const sortedArsenal = Object.entries(arsenalData).sort((a, b) => b[1] - a[1]);
    const itemsHtml = sortedArsenal.slice(0, 8).map(([name, count]) => `
      <div class="arsenal-item">
        <span class="arsenal-name">${name}</span>
        <span class="arsenal-count">${count} livros</span>
      </div>
    `).join('');

    return `
      <div class="widget-card arsenal-widget">
        <div class="card-header">
          <h3 class="card-title"><span class="material-icons">library_books</span> Arsenal de Conhecimento</h3>
          <p class="card-subtitle">Densidade da sua biblioteca por tema</p>
        </div>
        <div class="card-body">
          <div class="arsenal-list">
            ${itemsHtml.length > 0 ? itemsHtml : '<p class="empty-state">Nenhum livro vinculado a tópicos.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  renderProficiencyMapWidget() {
    // Reuse tree rendering logic from TopicsModule
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    const treeHtml = this.buildProficiencyTree(rootTopics);

    return `
      <div class="widget-card large-widget proficiency-widget">
        <div class="card-header">
          <h3 class="card-title"><span class="material-icons">map</span> Mapa de Proficiência</h3>
          <p class="card-subtitle">Seus pontos fortes e áreas de crescimento</p>
        </div>
        <div class="card-body">
          <div class="proficiency-legend">
            <span class="legend-item expert">Expert</span>
            <span class="legend-item advanced">Avançado</span>
            <span class="legend-item intermediate">Intermediário</span>
            <span class="legend-item beginner">Iniciante</span>
          </div>
          <div class="proficiency-tree">
            ${treeHtml.length > 0 ? treeHtml : '<p class="empty-state">Crie alguns tópicos para ver o mapa de proficiência.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  buildProficiencyTree(topics, level = 0) {
    if (!topics.length) return '';
    return `
      <ul class="proficiency-list" style="padding-left: ${level * 20}px;">
        ${topics.map(topic => `
          <li class="proficiency-node">
            <div class="proficiency-item ${(topic.proficiency || 'iniciante').toLowerCase()}">
              <span class="topic-name">${topic.name}</span>
              <span class="proficiency-badge">${topic.proficiency || 'Não definido'}</span>
            </div>
            ${this.buildProficiencyTree(this.topics.filter(t => t.parentId === topic.id), level + 1)}
          </li>
        `).join('')}
      </ul>
    `;
  }

  renderPyskeSuggestionsWidget() {
    const suggestions = [];

    // Enhanced Logic 1: Review suggestion with Status
    const topicsByLastStudy = {};
    this.sessions.forEach(s => {
      const sessionDate = s.sessionDate?.toDate ? s.sessionDate.toDate() : new Date(s.sessionDate);
      if (!topicsByLastStudy[s.topicId] || sessionDate > topicsByLastStudy[s.topicId]) {
        topicsByLastStudy[s.topicId] = sessionDate;
      }
    });

    this.topics.forEach(topic => {
      const lastStudyDate = topicsByLastStudy[topic.id];
      if (lastStudyDate && topic.status === 'Em Andamento') {
        const daysSince = (new Date() - lastStudyDate) / (1000 * 60 * 60 * 24);
        if (daysSince > 14) {
          suggestions.push({
            type: 'review',
            icon: '<span class="material-icons">refresh</span>',
            text: `<strong>${topic.name}</strong> está marcado como "Em Andamento", mas faz ${Math.floor(daysSince)} dias que você não estuda. Que tal retomar?`,
            action: topic
          });
        }
      }
    });

    // Enhanced Logic 2: High priority not started suggestion
    const highPriorityNotStarted = this.topics.filter(t => 
      t.priority === 'Alta' && t.status === 'Não Iniciado'
    );
    
    if (highPriorityNotStarted.length > 0) {
      suggestions.push({
        type: 'priority',
        icon: '<span class="material-icons">local_fire_department</span>',
        text: `Você tem ${highPriorityNotStarted.length} tópico(s) de alta prioridade ainda não iniciados. Hora de começar!`,
        action: highPriorityNotStarted[0]
      });
    }

    // Enhanced Logic 3: Due date suggestion
    const urgentTopics = this.topics.filter(t => {
      if (!t.dueDate) return false;
      const date = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      const diffDays = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && diffDays > 0;
    });

    if (urgentTopics.length > 0) {
      const topic = urgentTopics[0];
      const date = topic.dueDate.toDate ? topic.dueDate.toDate() : new Date(topic.dueDate);
      const diffDays = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      suggestions.push({
        type: 'urgent',
        icon: '<span class="material-icons">warning</span>',
        text: `<strong>Alerta:</strong> O estudo sobre "${topic.name}" tem prazo para daqui a ${diffDays} dia(s)!`,
        action: topic
      });
    }

    // Enhanced Logic 4: Hierarchy suggestion (subtopic completion)
    this.topics.filter(t => !t.parentId).forEach(parentTopic => {
      const subtopics = this.topics.filter(t => t.parentId === parentTopic.id);
      if (subtopics.length > 0) {
        const completedSubtopics = subtopics.filter(t => t.status === 'Concluído');
        if (completedSubtopics.length === subtopics.length && parentTopic.status !== 'Concluído') {
          suggestions.push({
            type: 'completion',
            icon: '<span class="material-icons">celebration</span>',
            text: `Parabéns! Você concluiu todos os subtópicos de "${parentTopic.name}". Considere marcar o tópico principal como concluído.`,
            action: parentTopic
          });
        }
      }
    });

    // Enhanced Logic 5: Organization suggestion (priorities)
    const inProgressCount = this.topics.filter(t => t.status === 'Em Andamento').length;
    if (inProgressCount > 5) {
      suggestions.push({
        type: 'organization',
        icon: '<span class="material-icons">checklist</span>',
        text: `Você tem ${inProgressCount} tópicos em andamento. Que tal organizar suas prioridades para focar melhor?`,
        action: { type: 'priorities' }
      });
    }

    // Get 3 random suggestions to display
    const shuffled = suggestions.sort(() => 0.5 - Math.random());
    const selectedSuggestions = shuffled.slice(0, 3);

    const suggestionsHtml = selectedSuggestions.map(s => `
      <div class="suggestion-card ${s.type}">
        <div class="suggestion-icon">${s.icon}</div>
        <div class="suggestion-content">
          <div class="suggestion-text">${s.text}</div>
          ${s.action && s.action.type === 'priorities' ? 
            `<button class="suggestion-action btn-sm" data-action="navigate-priorities">Organizar Prioridades</button>` :
            s.action ? `<button class="suggestion-action btn-sm" data-topic-id="${s.action.id}" data-topic-name="${s.action.name}" data-suggestion-type="${s.type}">
              ${s.type === 'review' || s.type === 'priority' || s.type === 'urgent' ? `Estudar ${s.action.name}` : 
                s.type === 'completion' ? `Marcar como Concluído` : 
                `Estudar ${s.action.name}`}
            </button>` : ''
          }
        </div>
      </div>
    `).join('');

    return `
      <div class="widget-card large-widget suggestions-widget">
        <div class="card-header">
          <h3 class="card-title"><span class="material-icons">psychology</span> Sugestões do Pyske</h3>
          <p class="card-subtitle">Seu assistente inteligente de estudos</p>
        </div>
        <div class="card-body">
          <div class="suggestions-list">
            ${suggestionsHtml.length > 0 ? suggestionsHtml : '<p class="empty-state">Sem sugestões no momento. Continue estudando!</p>'}
          </div>
        </div>
      </div>
    `;
  }

  // Enhanced initFocusDistributionChart with new suggestion actions
  initFocusDistributionChart() {
    // Setup suggestion action listeners
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-action')) {
        const action = e.target.dataset.action;
        const topicId = e.target.dataset.topicId;
        const topicName = e.target.dataset.topicName;
        const suggestionType = e.target.dataset.suggestionType;
        
        if (action === 'navigate-priorities') {
          window.app.navigateToSection('priorities');
        } else if (topicId && topicName) {
          if (suggestionType === 'completion') {
            // Mark topic as completed
            this.markTopicAsCompleted(topicId);
          } else {
            // Start study session
            window.app.startStudySession(topicId, topicName);
          }
        }
      }
    });
  }

  async markTopicAsCompleted(topicId) {
    try {
      // Use centralized service through app
      await window.app.firestoreService.updateDocument('topics', topicId, {
        status: 'Concluído'
      });
      
      // Refresh central data and reload dashboard
      await window.app.refreshData('topics');
      window.app.navigateToSection('dashboard');
      alert('Tópico marcado como concluído! 🎉');
    } catch (error) {
      console.error('Error updating topic status:', error);
      alert('Erro ao atualizar status do tópico.');
    }
  }
}