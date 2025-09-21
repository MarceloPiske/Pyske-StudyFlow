import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class StudyModule {
  constructor() {
    this.topics = [];
    this.recentSessions = [];
  }

  async render(user) {
    await Promise.all([
      this.loadTopics(user),
      this.loadRecentSessions(user)
    ]);

    return `
      <div class="study-container">
        <div class="study-header">
          <h1>Central de Estudos</h1>
          <p>Escolha um tópico e comece sua sessão de estudos</p>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Iniciar Sessão de Estudo</h3>
            </div>
            <div class="card-body">
              <div class="study-selector">
                <div class="form-group">
                  <label class="form-label">Selecione um Tópico</label>
                  <select id="study-topic-select" class="form-input">
                    <option value="">Escolha um tópico</option>
                    ${this.renderTopicOptions()}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Meta de Tempo (opcional)</label>
                  <select id="study-goal" class="form-input">
                    <option value="">Sem meta específica</option>
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h 30min</option>
                    <option value="120">2 horas</option>
                  </select>
                </div>

                <button id="start-study-btn" class="btn btn-primary btn-large" disabled>
                  <span>🚀</span> Iniciar Sessão de Estudo
                </button>
              </div>

              <div class="study-tips">
                <h4>💡 Dicas para uma sessão produtiva:</h4>
                <ul>
                  <li>Elimine distrações do ambiente</li>
                  <li>Tenha água por perto</li>
                  <li>Faça pausas a cada 25-30 minutos</li>
                  <li>Anote insights importantes</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Histórico Recente</h3>
            </div>
            <div class="card-body">
              <div class="recent-sessions">
                ${this.renderRecentSessions()}
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-3">
          <div class="card stats-card">
            <div class="card-body">
              <div class="stat-number">${this.getTotalStudyTime()}</div>
              <div class="stat-label">Horas Totais</div>
            </div>
          </div>

          <div class="card stats-card">
            <div class="card-body">
              <div class="stat-number">${this.getStudyStreak()}</div>
              <div class="stat-label">Dias Consecutivos</div>
            </div>
          </div>

          <div class="card stats-card">
            <div class="card-body">
              <div class="stat-number">${this.getAverageSessionTime()}</div>
              <div class="stat-label">Tempo Médio/Sessão</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Progresso por Tópico</h3>
          </div>
          <div class="card-body">
            <div class="topics-progress">
              ${this.renderTopicsProgress()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadTopics(user) {
    try {
      const topicsQuery = query(
        collection(window.db, 'topics'),
        where('userId', '==', user.uid),
        orderBy('name')
      );
      const snapshot = await getDocs(topicsQuery);

      this.topics = [];
      snapshot.forEach(doc => {
        this.topics.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  }

  async loadRecentSessions(user) {
    try {
      const sessionsQuery = query(
        collection(window.db, 'studySessions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(sessionsQuery);

      this.recentSessions = [];
      snapshot.forEach(doc => {
        this.recentSessions.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  }

  renderTopicOptions() {
    return this.topics.map(topic => 
      `<option value="${topic.id}" data-name="${topic.name}">${topic.name}</option>`
    ).join('');
  }

  renderRecentSessions() {
    if (!this.recentSessions.length) {
      return '<div class="empty-state">Nenhuma sessão registrada ainda.</div>';
    }

    return this.recentSessions.map(session => `
      <div class="session-item">
        <div class="session-topic">${session.topicName}</div>
        <div class="session-duration">${this.formatDuration(session.durationInSeconds)}</div>
        <div class="session-date">${this.formatRelativeTime(session.createdAt?.toDate())}</div>
        ${session.notes ? `<div class="session-notes">"${session.notes}"</div>` : ''}
      </div>
    `).join('');
  }

  renderTopicsProgress() {
    if (!this.topics.length) {
      return '<div class="empty-state">Crie alguns tópicos para ver o progresso.</div>';
    }

    const topicsWithStats = this.topics.map(topic => {
      const sessions = this.recentSessions.filter(s => s.topicId === topic.id);
      const totalTime = sessions.reduce((sum, s) => sum + (s.durationInSeconds || 0), 0);
      const sessionCount = sessions.length;

      return {
        ...topic,
        totalTime,
        sessionCount,
        averageTime: sessionCount > 0 ? totalTime / sessionCount : 0
      };
    });

    return topicsWithStats.map(topic => `
      <div class="topic-progress-item">
        <div class="topic-info">
          <h4>${topic.name}</h4>
          <span class="proficiency ${topic.proficiency?.toLowerCase()}">${topic.proficiency || 'Não definido'}</span>
        </div>
        <div class="topic-stats">
          <div class="stat">
            <span class="stat-value">${Math.round(topic.totalTime / 3600)}h</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat">
            <span class="stat-value">${topic.sessionCount}</span>
            <span class="stat-label">Sessões</span>
          </div>
          <div class="stat">
            <span class="stat-value">${Math.round(topic.averageTime / 60)}min</span>
            <span class="stat-label">Média</span>
          </div>
        </div>
        <button class="btn btn-sm study-topic-btn" data-topic-id="${topic.id}" data-topic-name="${topic.name}">
          Estudar
        </button>
      </div>
    `).join('');
  }

  getTotalStudyTime() {
    const totalSeconds = this.recentSessions.reduce((sum, session) => 
      sum + (session.durationInSeconds || 0), 0);
    return Math.round(totalSeconds / 3600);
  }

  getStudyStreak() {
    // Simple implementation - count consecutive days with sessions
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    for (let i = 0; i < 30; i++) { // Check last 30 days
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const hasSession = this.recentSessions.some(session => {
        const sessionDate = session.createdAt?.toDate();
        return sessionDate && sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      if (hasSession) {
        streak++;
      } else if (i > 0) { // Don't break on first day (today might not have sessions yet)
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  getAverageSessionTime() {
    if (!this.recentSessions.length) return 0;
    const totalSeconds = this.recentSessions.reduce((sum, session) => 
      sum + (session.durationInSeconds || 0), 0);
    return Math.round(totalSeconds / this.recentSessions.length / 60); // in minutes
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  formatRelativeTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}min atrás`;
    return 'Agora mesmo';
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Topic selection
    const topicSelect = document.getElementById('study-topic-select');
    const startBtn = document.getElementById('start-study-btn');

    topicSelect?.addEventListener('change', (e) => {
      startBtn.disabled = !e.target.value;
    });

    // Start study button
    startBtn?.addEventListener('click', () => {
      const topicId = topicSelect.value;
      const topicName = topicSelect.selectedOptions[0]?.dataset.name;
      const goal = document.getElementById('study-goal').value;

      if (topicId && topicName) {
        this.startStudySession(topicId, topicName, goal);
      }
    });

    // Quick study buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('study-topic-btn')) {
        const topicId = e.target.dataset.topicId;
        const topicName = e.target.dataset.topicName;
        this.startStudySession(topicId, topicName);
      }
    });
  }

  startStudySession(topicId, topicName, goalMinutes = null) {
    // Set study goal if specified
    if (goalMinutes) {
      window.app.timer.studyGoal = parseInt(goalMinutes) * 60; // Convert to seconds
    }

    window.app.timer.start(topicId, topicName);
  }
}