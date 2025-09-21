import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class FocusModule {
  constructor() {
    this.topics = [];
    this.currentTopic = null;
    this.isRunning = false;
    this.isPaused = false;
    this.isBreak = false;
    this.timeLeft = 25 * 60; // 25 minutes default
    this.interval = null;
    this.startTime = null;
    this.totalStudied = 0;
  }

  async render(user) {
    await this.loadTopics(user);

    return `
      <div class="focus-container">
        <div class="focus-header">
          <h1>Sessão de Foco</h1>
          <p>Ambiente dedicado para estudos concentrados</p>
        </div>

        <div class="grid grid-2">
          <div class="card focus-tools">
            <div class="card-header">
              <h3 class="card-title"> Timer Pomodoro</h3>
            </div>
            <div class="card-body">
              <div class="pomodoro-timer">
                <div class="timer-display" id="focus-timer-display">25:00</div>
                <div class="timer-mode" id="timer-mode">Modo Foco</div>
                
                <div class="timer-controls">
                  <button id="focus-start-pause-btn" class="btn btn-primary">Iniciar</button>
                  <button id="focus-reset-btn" class="btn btn-secondary">Resetar</button>
                </div>

                <div class="timer-settings">
                  <div class="form-group">
                    <label class="form-label">Tempo de Foco (min)</label>
                    <input type="number" id="focus-time-input" class="form-input" value="25" min="5" max="60">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tempo de Pausa (min)</label>
                    <input type="number" id="break-time-input" class="form-input" value="5" min="1" max="30">
                  </div>
                </div>

                <div class="focus-topic-selector">
                  <label class="form-label">Tópico de Estudo</label>
                  <select id="focus-topic-select" class="form-input">
                    <option value="">Selecione um tópico</option>
                    ${this.renderTopicOptions()}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="card focus-music">
            <div class="card-header">
              <h3 class="card-title"> Música de Estudo</h3>
            </div>
            <div class="card-body">
              <div class="youtube-player">
                <div class="form-group">
                  <label class="form-label">Link do YouTube</label>
                  <div class="youtube-input-group">
                    <input type="text" id="youtube-link-input" class="form-input" placeholder="https://www.youtube.com/watch?v=...">
                    <button id="load-video-btn" class="btn btn-secondary">Carregar</button>
                  </div>
                </div>
                
                <div class="video-container" id="video-container" style="display: none;">
                  <iframe id="youtube-iframe" width="100%" height="200" src="" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>

                <div class="music-presets">
                  <p class="form-label">Sugestões populares:</p>
                  <div class="preset-buttons">
                    <button class="btn-preset" data-video="jfKfPfyJRdk">Lofi Hip Hop</button>
                    <button class="btn-preset" data-video="5qap5aO4i9A">Chuva Relaxante</button>
                    <button class="btn-preset" data-video="4xDzrJKXOOY">Piano Clássico</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card focus-notes">
          <div class="card-header">
            <h3 class="card-title"> Anotações da Sessão</h3>
            <div class="current-topic-display">
              Estudando: <strong id="current-topic-name">Nenhum tópico selecionado</strong>
            </div>
          </div>
          <div class="card-body">
            <div class="session-stats">
              <div class="stat-item">
                <span class="stat-label">Tempo Total:</span>
                <span class="stat-value" id="total-studied-time">0min</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Ciclos Completos:</span>
                <span class="stat-value" id="completed-cycles">0</span>
              </div>
            </div>

            <textarea id="session-notes-textarea" class="form-input session-notes-input" placeholder="Digite suas anotações, insights e reflexões durante o estudo..."></textarea>
            
            <div class="notes-actions">
              <button id="save-notes-btn" class="btn btn-primary"> Salvar Sessão</button>
              <button id="clear-notes-btn" class="btn btn-ghost"> Limpar</button>
            </div>
          </div>
        </div>

        <div class="focus-ambient">
          <div class="ambient-controls">
            <h4> Ambiente de Foco</h4>
            <div class="ambient-options">
              <label class="ambient-option">
                <input type="checkbox" id="enable-fullscreen"> Modo Tela Cheia
              </label>
              <label class="ambient-option">
                <input type="checkbox" id="enable-notifications"> Notificações Sonoras
              </label>
              <label class="ambient-option">
                <input type="checkbox" id="block-distractions"> Bloquear Distrações
              </label>
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

  renderTopicOptions() {
    return this.topics.map(topic => 
      `<option value="${topic.id}" data-name="${topic.name}">${topic.name}</option>`
    ).join('');
  }

  init() {
    this.setupEventListeners();
    this.updateDisplay();
  }

  setupEventListeners() {
    // Timer controls
    document.getElementById('focus-start-pause-btn')?.addEventListener('click', () => {
      this.toggleTimer();
    });

    document.getElementById('focus-reset-btn')?.addEventListener('click', () => {
      this.resetTimer();
    });

    // Topic selection
    document.getElementById('focus-topic-select')?.addEventListener('change', (e) => {
      const topicId = e.target.value;
      const topicName = e.target.selectedOptions[0]?.dataset.name;
      this.selectTopic(topicId, topicName);
    });

    // YouTube player
    document.getElementById('load-video-btn')?.addEventListener('click', () => {
      this.loadYouTubeVideo();
    });

    // Preset music buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const videoId = e.target.dataset.video;
        this.loadPresetVideo(videoId);
      });
    });

    // Notes actions
    document.getElementById('save-notes-btn')?.addEventListener('click', () => {
      this.saveSession();
    });

    document.getElementById('clear-notes-btn')?.addEventListener('click', () => {
      document.getElementById('session-notes-textarea').value = '';
    });

    // Ambient controls
    document.getElementById('enable-fullscreen')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.enterFullscreen();
      } else {
        this.exitFullscreen();
      }
    });

    // Time input changes
    document.getElementById('focus-time-input')?.addEventListener('change', () => {
      if (!this.isRunning) {
        this.resetTimer();
      }
    });
  }

  selectTopic(topicId, topicName) {
    this.currentTopic = { id: topicId, name: topicName };
    const display = document.getElementById('current-topic-name');
    if (display) {
      display.textContent = topicName || 'Nenhum tópico selecionado';
    }
  }

  toggleTimer() {
    if (!this.currentTopic?.id) {
      alert('Por favor, selecione um tópico antes de iniciar!');
      return;
    }

    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();

    document.getElementById('focus-start-pause-btn').textContent = 'Pausar';
    
    this.interval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        this.completeTimer();
      }
    }, 1000);
  }

  pauseTimer() {
    this.isRunning = false;
    this.isPaused = true;
    
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Add elapsed time to total
    if (this.startTime && !this.isBreak) {
      this.totalStudied += Math.floor((Date.now() - this.startTime) / 1000);
      this.updateTotalTime();
    }

    document.getElementById('focus-start-pause-btn').textContent = 'Continuar';
  }

  resetTimer() {
    this.isRunning = false;
    this.isPaused = false;
    this.isBreak = false;
    
    if (this.interval) {
      clearInterval(this.interval);
    }

    const focusTime = parseInt(document.getElementById('focus-time-input').value) || 25;
    this.timeLeft = focusTime * 60;
    
    document.getElementById('focus-start-pause-btn').textContent = 'Iniciar';
    document.getElementById('timer-mode').textContent = 'Modo Foco';
    
    this.updateDisplay();
  }

  completeTimer() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Add completed cycle time
    if (!this.isBreak) {
      const focusTime = parseInt(document.getElementById('focus-time-input').value) || 25;
      this.totalStudied += focusTime * 60;
      this.updateCompletedCycles();
    }

    this.playNotificationSound();

    // Switch between focus and break
    this.isBreak = !this.isBreak;
    
    if (this.isBreak) {
      const breakTime = parseInt(document.getElementById('break-time-input').value) || 5;
      this.timeLeft = breakTime * 60;
      document.getElementById('timer-mode').textContent = 'Modo Pausa';
      this.showNotification('Hora da pausa! ', 'Você completou um ciclo de foco.');
    } else {
      const focusTime = parseInt(document.getElementById('focus-time-input').value) || 25;
      this.timeLeft = focusTime * 60;
      document.getElementById('timer-mode').textContent = 'Modo Foco';
      this.showNotification('Fim da pausa! ', 'Hora de voltar ao foco.');
    }

    this.isRunning = false;
    document.getElementById('focus-start-pause-btn').textContent = 'Iniciar';
    this.updateDisplay();
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const display = document.getElementById('focus-timer-display');
    
    if (display) {
      display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    this.updateTotalTime();
  }

  updateTotalTime() {
    const totalMinutes = Math.floor(this.totalStudied / 60);
    const display = document.getElementById('total-studied-time');
    if (display) {
      display.textContent = `${totalMinutes}min`;
    }
  }

  updateCompletedCycles() {
    const cyclesElement = document.getElementById('completed-cycles');
    if (cyclesElement) {
      const current = parseInt(cyclesElement.textContent) || 0;
      cyclesElement.textContent = current + 1;
    }
  }

  loadYouTubeVideo() {
    const url = document.getElementById('youtube-link-input').value.trim();
    if (!url) return;

    const videoId = this.extractVideoID(url);
    if (videoId) {
      this.setVideoIframe(videoId);
    } else {
      alert('URL do YouTube inválida!');
    }
  }

  loadPresetVideo(videoId) {
    document.getElementById('youtube-link-input').value = `https://www.youtube.com/watch?v=${videoId}`;
    this.setVideoIframe(videoId);
  }

  setVideoIframe(videoId) {
    const iframe = document.getElementById('youtube-iframe');
    const container = document.getElementById('video-container');
    
    if (iframe && container) {
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
      container.style.display = 'block';
    }
  }

  extractVideoID(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|[\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async saveSession() {
    if (!this.currentTopic?.id) {
      alert('Selecione um tópico antes de salvar a sessão!');
      return;
    }

    const notes = document.getElementById('session-notes-textarea').value.trim();
    
    if (this.totalStudied === 0 && !notes) {
      alert('Nenhum tempo de estudo registrado ou anotações feitas!');
      return;
    }

    try {
      const user = window.auth.currentUser;
      if (!user) return;

      await addDoc(collection(window.db, 'studySessions'), {
        userId: user.uid,
        topicId: this.currentTopic.id,
        topicName: this.currentTopic.name,
        durationInSeconds: this.totalStudied,
        notes: notes,
        sessionType: 'focus',
        completedCycles: parseInt(document.getElementById('completed-cycles').textContent) || 0,
        createdAt: new Date()
      });

      alert('Sessão de foco salva com sucesso! ');
      
      // Reset session
      this.totalStudied = 0;
      document.getElementById('session-notes-textarea').value = '';
      document.getElementById('completed-cycles').textContent = '0';
      this.updateTotalTime();
      
    } catch (error) {
      console.error('Error saving focus session:', error);
      alert('Erro ao salvar sessão. Tente novamente.');
    }
  }

  playNotificationSound() {
    if (document.getElementById('enable-notifications')?.checked) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  }

  showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192x192.png' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/icon-192x192.png' });
        }
      });
    }
  }

  enterFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}