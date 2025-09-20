import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class DashboardModule {
  constructor() {
    this.charts = {};
  }

  async render(user) {
    const stats = await this.getStats(user);
    
    return `
      <div class="dashboard">
        <div class="dashboard-header">
          <h1>Dashboard</h1>
          <p>Bem-vindo de volta, ${user.displayName}!</p>
        </div>

        <div class="grid grid-2" style="margin-bottom: 2rem;">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Estatísticas Gerais</h3>
            </div>
            <div class="card-body">
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-number">${stats.totalStudyTime}</div>
                  <div class="stat-label">Horas de Estudo</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">${stats.totalTopics}</div>
                  <div class="stat-label">Tópicos</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">${stats.totalBooks}</div>
                  <div class="stat-label">Livros</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">${stats.totalNotes}</div>
                  <div class="stat-label">Anotações</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Progresso Semanal</h3>
            </div>
            <div class="card-body">
              <canvas id="weekly-progress-chart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Tópicos por Tempo de Estudo</h3>
            </div>
            <div class="card-body">
              <canvas id="topics-chart" width="400" height="200"></canvas>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Atividade Recente</h3>
            </div>
            <div class="card-body">
              <div class="activity-list">
                ${stats.recentActivity.map(activity => `
                  <div class="activity-item">
                    <div class="activity-icon">${this.getActivityIcon(activity.type)}</div>
                    <div class="activity-content">
                      <div class="activity-title">${activity.title}</div>
                      <div class="activity-time">${activity.time}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async getStats(user) {
    try {
      // Get study sessions
      const sessionsQuery = query(
        collection(window.db, 'studySessions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      // Get topics
      const topicsQuery = query(
        collection(window.db, 'topics'),
        where('userId', '==', user.uid)
      );
      const topicsSnapshot = await getDocs(topicsQuery);
      
      // Get books
      const booksQuery = query(
        collection(window.db, 'books'),
        where('userId', '==', user.uid)
      );
      const booksSnapshot = await getDocs(booksQuery);
      
      // Get notes
      const notesQuery = query(
        collection(window.db, 'notes'),
        where('userId', '==', user.uid)
      );
      const notesSnapshot = await getDocs(notesQuery);

      // Calculate total study time
      let totalSeconds = 0;
      sessionsSnapshot.forEach((doc) => {
        totalSeconds += doc.data().durationInSeconds || 0;
      });
      const totalHours = Math.round(totalSeconds / 3600);

      // Recent activity
      const recentActivity = [];
      sessionsSnapshot.docs.slice(0, 5).forEach((doc) => {
        const data = doc.data();
        recentActivity.push({
          type: 'study',
          title: `Estudou por ${Math.round(data.durationInSeconds / 60)} minutos`,
          time: this.formatRelativeTime(data.createdAt?.toDate())
        });
      });

      return {
        totalStudyTime: totalHours,
        totalTopics: topicsSnapshot.size,
        totalBooks: booksSnapshot.size,
        totalNotes: notesSnapshot.size,
        recentActivity
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalStudyTime: 0,
        totalTopics: 0,
        totalBooks: 0,
        totalNotes: 0,
        recentActivity: []
      };
    }
  }

  getActivityIcon(type) {
    const icons = {
      study: '📚',
      book: '📖',
      note: '📝',
      topic: '🏷️'
    };
    return icons[type] || '📄';
  }

  formatRelativeTime(date) {
    if (!date) return 'Agora mesmo';
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  }

  init() {
    this.initCharts();
  }

  initCharts() {
    // Weekly progress chart
    const weeklyCtx = document.getElementById('weekly-progress-chart');
    if (weeklyCtx) {
      this.charts.weekly = new Chart(weeklyCtx, {
        type: 'line',
        data: {
          labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
          datasets: [{
            label: 'Horas de Estudo',
            data: [2, 3, 4, 2, 5, 6, 3],
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Topics chart
    const topicsCtx = document.getElementById('topics-chart');
    if (topicsCtx) {
      this.charts.topics = new Chart(topicsCtx, {
        type: 'doughnut',
        data: {
          labels: ['Teologia', 'História', 'Filosofia', 'Literatura'],
          datasets: [{
            data: [40, 25, 20, 15],
            backgroundColor: [
              '#007bff',
              '#28a745',
              '#ffc107',
              '#dc3545'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  }
}