import { 
  collection, 
  addDoc 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class SessionManager {
  constructor(db, user) {
    this.db = db;
    this.user = user;
    this.activeSession = null;
    this.musicPaused = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Session controls
    document.getElementById('session-pause-btn')?.addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('session-stop-btn')?.addEventListener('click', () => {
      this.showEndModal();
    });

    document.getElementById('session-maximize-btn')?.addEventListener('click', () => {
      this.maximizeSession();
    });

    document.getElementById('session-music-btn')?.addEventListener('click', () => {
      this.showMusicModal();
    });

    // NEW: Music pause/play button
    document.getElementById('session-music-toggle-btn')?.addEventListener('click', () => {
      this.toggleMusic();
    });

    // Session music modal
    document.getElementById('close-music-modal')?.addEventListener('click', () => {
      this.hideMusicModal();
    });

    document.getElementById('session-load-video')?.addEventListener('click', () => {
      this.loadMusic();
    });

    // Music preset buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-preset')) {
        const videoId = e.target.dataset.video;
        this.loadPreset(videoId);
      }
    });

    // Session end modal
    document.getElementById('save-session-btn')?.addEventListener('click', () => {
      this.saveAndEnd();
    });

    document.getElementById('discard-session-btn')?.addEventListener('click', () => {
      this.discardSession();
    });

    document.getElementById('close-session-modal')?.addEventListener('click', () => {
      this.hideEndModal();
    });
  }

  startSession(topicId, topicName, bookId = null, sessionType = 'study') {
    // Prevent multiple session starts
    if (this.activeSession) {
      if (!confirm('Já existe uma sessão ativa. Deseja finalizar a sessão atual e iniciar uma nova?')) {
        return;
      }
      this.forceEndSession(); // Force end without saving
    }

    this.activeSession = {
      topicId,
      topicName,
      bookId,
      sessionType,
      startTime: new Date(),
      isPaused: false,
      intervalId: null,
      totalPausedTime: 0,
      lastPauseTime: null
    };

    this.showPanel();
    this.startTimer();
    
    console.log('Started study session:', this.activeSession);
  }

  showPanel() {
    const panel = document.getElementById('active-session-panel');
    const topicName = document.getElementById('session-topic-name');
    
    if (topicName && this.activeSession) {
      topicName.textContent = this.activeSession.topicName;
    }
    
    // Update music toggle button visibility
    this.updateMusicToggleButton();
    
    panel?.classList.remove('hidden');
  }

  hidePanel() {
    document.getElementById('active-session-panel')?.classList.add('hidden');
  }

  startTimer() {
    if (this.activeSession?.intervalId) {
      clearInterval(this.activeSession.intervalId);
    }

    this.activeSession.intervalId = setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  updateDisplay() {
    if (!this.activeSession || this.activeSession.isPaused) return;

    const now = new Date();
    const elapsed = now.getTime() - this.activeSession.startTime.getTime() - this.activeSession.totalPausedTime;
    const seconds = Math.floor(elapsed / 1000);
    
    const display = document.getElementById('session-elapsed-time');
    if (display) {
      display.textContent = this.formatTime(seconds);
    }
  }

  togglePause() {
    if (!this.activeSession) return;

    const pauseBtn = document.getElementById('session-pause-btn');
    
    if (this.activeSession.isPaused) {
      // Resume
      const pauseDuration = new Date().getTime() - this.activeSession.lastPauseTime.getTime();
      this.activeSession.totalPausedTime += pauseDuration;
      this.activeSession.isPaused = false;
      this.activeSession.lastPauseTime = null;
      this.startTimer();
      if (pauseBtn) pauseBtn.innerHTML = '<span class="material-icons">pause</span>';
    } else {
      // Pause
      this.activeSession.isPaused = true;
      this.activeSession.lastPauseTime = new Date();
      if (this.activeSession.intervalId) {
        clearInterval(this.activeSession.intervalId);
      }
      if (pauseBtn) pauseBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
    }
  }

  // NEW: Toggle music play/pause
  toggleMusic() {
    const iframe = document.getElementById('session-youtube-iframe');
    const toggleBtn = document.getElementById('session-music-toggle-btn');
    
    if (!iframe || !iframe.src) {
      this.showMusicModal();
      return;
    }

    try {
      if (this.musicPaused) {
        // Resume music
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        this.musicPaused = false;
        if (toggleBtn) toggleBtn.innerHTML = '<span class="material-icons">volume_up</span>';
      } else {
        // Pause music
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        this.musicPaused = true;
        if (toggleBtn) toggleBtn.innerHTML = '<span class="material-icons">volume_off</span>';
      }
    } catch (error) {
      console.warn('Could not control YouTube player:', error);
      // Fallback: show music modal
      this.showMusicModal();
    }
  }

  updateMusicToggleButton() {
    const toggleBtn = document.getElementById('session-music-toggle-btn');
    const iframe = document.getElementById('session-youtube-iframe');
    
    if (toggleBtn) {
      if (iframe && iframe.src) {
        toggleBtn.style.display = 'flex';
        toggleBtn.innerHTML = this.musicPaused ? 
          '<span class="material-icons">volume_off</span>' : 
          '<span class="material-icons">volume_up</span>';
      } else {
        toggleBtn.style.display = 'none';
      }
    }
  }

  showEndModal() {
    if (!this.activeSession) return;

    // Pause the session timer while showing modal
    if (!this.activeSession.isPaused) {
      this.togglePause();
    }

    const modal = document.getElementById('session-notes-modal');
    const topicName = document.getElementById('summary-topic-name');
    const duration = document.getElementById('summary-duration');
    
    const elapsed = this.getDuration();
    const minutes = Math.floor(elapsed / 60000);
    
    if (topicName) topicName.textContent = this.activeSession.topicName;
    if (duration) duration.textContent = `${minutes} minutos`;
    
    modal?.classList.remove('hidden');
  }

  hideEndModal() {
    const modal = document.getElementById('session-notes-modal');
    modal?.classList.add('hidden');
    
    // Resume session if it was paused for the modal
    if (this.activeSession && this.activeSession.isPaused) {
      this.togglePause();
    }
  }

  getDuration() {
    if (!this.activeSession) return 0;
    
    const now = new Date();
    let elapsed = now.getTime() - this.activeSession.startTime.getTime() - this.activeSession.totalPausedTime;
    
    // If currently paused, don't include current pause time
    if (this.activeSession.isPaused && this.activeSession.lastPauseTime) {
      // Time is already correctly calculated up to last pause
    }
    
    return Math.max(0, elapsed);
  }

  async saveAndEnd() {
    if (!this.activeSession) return;

    try {
      const notes = document.getElementById('session-quick-notes')?.value.trim() || '';
      const elapsed = this.getDuration();
      const durationInSeconds = Math.floor(elapsed / 1000);

      // Ensure minimum duration
      if (durationInSeconds < 1) {
        alert('Sessão muito curta para ser salva.');
        this.forceEndSession();
        return;
      }

      const sessionData = {
        userId: this.user.uid,
        topicId: this.activeSession.topicId,
        topicName: this.activeSession.topicName,
        bookId: this.activeSession.bookId || null,
        durationInSeconds,
        notes: notes || null,
        sessionType: this.activeSession.sessionType || 'study',
        createdAt: new Date()
      };

      await addDoc(collection(this.db, 'studySessions'), sessionData);
      
      this.endSession();
      alert('Sessão salva com sucesso!');
      
      // Refresh dashboard data if on dashboard
      if (window.app.currentSection === 'dashboard') {
        window.app.navigateToSection('dashboard');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Erro ao salvar sessão. Tente novamente.');
    }
  }

  discardSession() {
    if (confirm('Tem certeza que deseja descartar esta sessão sem salvar?')) {
      this.endSession();
    } else {
      this.hideEndModal();
    }
  }

  // NEW: Force end session without confirmation
  forceEndSession() {
    this.endSession();
  }

  endSession() {
    if (this.activeSession?.intervalId) {
      clearInterval(this.activeSession.intervalId);
    }
    
    this.activeSession = null;
    this.musicPaused = false;
    this.hidePanel();
    this.hideEndModal();
    
    // Clear quick notes
    const notesField = document.getElementById('session-quick-notes');
    if (notesField) notesField.value = '';
  }

  maximizeSession() {
    if (!this.activeSession) return;

    if (this.activeSession.bookId) {
      window.app.navigateToSection('books', { detailId: this.activeSession.bookId });
    } else {
      window.app.navigateToSection('topics', { detailId: this.activeSession.topicId });
    }
  }

  showMusicModal() {
    document.getElementById('session-music-modal')?.classList.remove('hidden');
  }

  hideMusicModal() {
    document.getElementById('session-music-modal')?.classList.add('hidden');
  }

  loadMusic() {
    const url = document.getElementById('session-youtube-link').value.trim();
    if (!url) return;

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      alert('URL do YouTube inválida. Tente novamente.');
      return;
    }

    this.loadVideo(videoId);
  }

  loadPreset(videoId) {
    this.loadVideo(videoId);
  }

  loadVideo(videoId) {
    const iframe = document.getElementById('session-youtube-iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&mute=1&controls=1&loop=1&playlist=${videoId}`;
    document.getElementById('session-video-container').style.display = 'block';
    
    // Update music toggle button visibility
    this.updateMusicToggleButton();
    this.hideMusicModal();
  }

  extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  hasActiveSession() {
    return this.activeSession !== null;
  }
}