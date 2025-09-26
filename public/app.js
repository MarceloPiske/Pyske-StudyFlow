// Import Firebase modules
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

import { 
  collection, 
  addDoc 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Import modules
import { DashboardModule } from './modules/dashboard.js';
import { TopicsModule } from './modules/topics.js';
import { BooksModule } from './modules/books.js';
import { PrioritiesModule } from './modules/priorities.js';
import { FirestoreService } from './services/firestore-service.js';

class App {
  constructor() {
    // Firebase references (set by index.html)
    this.auth = window.auth;
    this.db = window.db;
    
    this.user = null;
    this.currentSection = 'dashboard';
    
    // ===== CENTRALIZED STATE - SINGLE SOURCE OF TRUTH =====
    this.allTopics = [];
    this.allBooks = [];
    this.allResources = [];
    this.priorityQueueIds = [];
    this.firestoreService = null;
    // ======================================================
    
    // Centralized session management
    this.activeSession = null; // { topicId, topicName, bookId, startTime, isPaused, intervalId, sessionType }
    
    // Module instances
    this.modules = {};
    
    // Initialize app
    this.init();
  }

  async init() {
    // Wait for Firebase to be ready
    while (!this.auth || !this.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Set up auth listener
    this.listenAuthState();
    
    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading-screen')?.classList.add('hidden');
    }, 1000);
  }

  listenAuthState() {
    onAuthStateChanged(this.auth, (user) => {
      const authContainer = document.getElementById('auth-container');
      const appContainer = document.getElementById('app');

      if (user) {
        // User is logged in
        this.user = user;
        this.initApp();
        authContainer?.classList.add('hidden');
        appContainer?.classList.remove('hidden');
      } else {
        // User is logged out
        this.user = null;
        authContainer?.classList.remove('hidden');
        appContainer?.classList.add('hidden');
        this.setupAuthEventListeners();
      }
    }, (error) => {
      console.error('Auth state change error:', error);
    });
  }

  async initApp() {
    // Initialize Firestore service
    this.firestoreService = new FirestoreService(this.db, this.user);

    // Initialize modules (they no longer need db or user since they don't load data)
    this.modules = {
      dashboard: new DashboardModule(),
      topics: new TopicsModule(),
      books: new BooksModule(),
      priorities: new PrioritiesModule()
    };

    // Update user info
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
      userAvatar.src = this.user.photoURL || '/default-avatar.png';
    }

    // Load centralized data once
    await this.loadCentralizedData();

    // Setup event listeners
    this.setupAppEventListeners();
    this.setupSessionPanelListeners();
    
    // Load initial section
    this.navigateToSection('dashboard');
  }

  // NEW METHOD: Load all data once and store in central state
  async loadCentralizedData() {
    try {
      const [topics, books, priorities] = await Promise.all([
        this.firestoreService.getCollection('topics', 'name', 'asc'),
        this.firestoreService.getCollection('books', 'createdAt', 'desc'),
        this.firestoreService.getUserDocument('settings/priorities')
      ]);
      
      this.allTopics = topics;
      this.allBooks = books;
      this.priorityQueueIds = priorities?.queue || [];
      
      console.log("Central state loaded:", { 
        topics: this.allTopics.length, 
        books: this.allBooks.length,
        priorityQueue: this.priorityQueueIds.length
      });
    } catch (error) {
      console.error("Error loading central data:", error);
      // Set empty arrays as fallback
      this.allTopics = [];
      this.allBooks = [];
      this.priorityQueueIds = [];
    }
  }

  // NEW METHOD: Refresh data after CRUD operations
  async refreshData(dataType = 'all') {
    try {
      if (dataType === 'all' || dataType === 'topics') {
        this.allTopics = await this.firestoreService.getCollection('topics', 'name', 'asc');
      }
      if (dataType === 'all' || dataType === 'books') {
        this.allBooks = await this.firestoreService.getCollection('books', 'createdAt', 'desc');
      }
      if (dataType === 'all' || dataType === 'priorities') {
        const priorities = await this.firestoreService.getUserDocument('settings/priorities');
        this.priorityQueueIds = priorities?.queue || [];
      }
      console.log(`Refreshed ${dataType} data`);
    } catch (error) {
      console.error(`Error refreshing ${dataType} data:`, error);
    }
  }

  // NEW METHOD: Update priority queue
  async updatePriorityQueue(queueIds) {
    try {
      this.priorityQueueIds = queueIds;
      await this.firestoreService.setUserDocument('settings/priorities', {
        queue: queueIds
      });
      console.log('Priority queue updated');
    } catch (error) {
      console.error('Error updating priority queue:', error);
      throw error;
    }
  }

  setupAuthEventListeners() {
    const googleLoginBtn = document.getElementById('google-login');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => this.signInWithGoogle());
    }
  }

  setupAppEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.navigateToSection(section);
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  setupSessionPanelListeners() {
    // Session controls
    document.getElementById('session-pause-btn')?.addEventListener('click', () => {
      this.toggleSessionPause();
    });

    document.getElementById('session-stop-btn')?.addEventListener('click', () => {
      this.showSessionEndModal();
    });

    document.getElementById('session-maximize-btn')?.addEventListener('click', () => {
      this.maximizeSession();
    });

    document.getElementById('session-music-btn')?.addEventListener('click', () => {
      this.showSessionMusicModal();
    });

    // Session music modal
    document.getElementById('close-music-modal')?.addEventListener('click', () => {
      this.hideSessionMusicModal();
    });

    document.getElementById('session-load-video')?.addEventListener('click', () => {
      this.loadSessionMusic();
    });

    // Music preset buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-preset')) {
        const videoId = e.target.dataset.video;
        this.loadSessionPreset(videoId);
      }
    });

    // Session end modal
    document.getElementById('save-session-btn')?.addEventListener('click', () => {
      this.saveAndEndSession();
    });

    document.getElementById('discard-session-btn')?.addEventListener('click', () => {
      this.discardSession();
    });

    document.getElementById('close-session-modal')?.addEventListener('click', () => {
      this.hideSessionEndModal();
    });
  }

  async navigateToSection(sectionId, options = {}) {
    console.log(`Navigating to: ${sectionId}`, options);
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    this.currentSection = sectionId;
    const mainContent = document.getElementById('main-content');
    
    // Show loading state
    mainContent.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>Carregando...</p></div>';

    try {
      const module = this.modules[sectionId];
      if (!module) {
        throw new Error(`Module ${sectionId} not found`);
      }

      let html;

      // Handle detail view vs list view
      if (options.detailId) {
        // Render detail view - modules can still load specific documents
        switch (sectionId) {
          case 'topics':
            html = await module.renderDetailView(options.detailId, this.firestoreService);
            break;
          case 'books':
            html = await module.renderDetailView(options.detailId, this.allTopics, this.firestoreService);
            break;
          default:
            html = await module.renderDetailView(options.detailId, this.firestoreService);
        }
        
        // Initialize detail view listeners
        if (module.initDetailViewListeners) {
          setTimeout(() => module.initDetailViewListeners(this.firestoreService), 100);
        }
      } else {
        // Render list view - pass central data to modules
        switch (sectionId) {
          case 'dashboard':
            html = await module.render(this.allTopics, this.allBooks, this.firestoreService);
            break;
            
          case 'topics':
            html = await module.renderListView(this.allTopics);
            break;
            
          case 'books':
            html = await module.render(this.allTopics, this.allBooks);
            break;

          case 'priorities':
            // Get priority queue topics from central state
            const priorityQueueTopics = this.priorityQueueIds
              .map(id => this.allTopics.find(t => t.id === id))
              .filter(Boolean);
            html = await module.render(this.allTopics, priorityQueueTopics, this.priorityQueueIds);
            break;
            
          default:
            html = await module.render();
        }

        // Initialize list view listeners
        if (module.initListViewListeners) {
          setTimeout(() => module.initListViewListeners(this.firestoreService), 100);
        } else if (module.init) {
          setTimeout(() => module.init(this.firestoreService), 100);
        }
      }

      // Render content
      mainContent.innerHTML = html;

    } catch (error) {
      console.error(`Error loading section ${sectionId}:`, error);
      mainContent.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h2>Erro ao carregar seção</h2>
            <p>Ocorreu um erro ao carregar esta seção. Tente novamente.</p>
            <button class="btn btn-primary" onclick="window.app.navigateToSection('${sectionId}')">
              Tentar Novamente
            </button>
          </div>
        </div>
      `;
    }
  }

  // Centralized Session Management Methods
  startStudySession(topicId, topicName, bookId = null, sessionType = 'study') {
    if (this.activeSession) {
      if (!confirm('Já existe uma sessão ativa. Deseja finalizar a sessão atual e iniciar uma nova?')) {
        return;
      }
      this.discardSession();
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

    this.showSessionPanel();
    this.startSessionTimer();
    
    console.log('Started study session:', this.activeSession);
  }

  showSessionPanel() {
    const panel = document.getElementById('active-session-panel');
    const topicName = document.getElementById('session-topic-name');
    
    if (topicName && this.activeSession) {
      topicName.textContent = this.activeSession.topicName;
    }
    panel?.classList.remove('hidden');
  }

  hideSessionPanel() {
    document.getElementById('active-session-panel')?.classList.add('hidden');
  }

  startSessionTimer() {
    if (this.activeSession?.intervalId) {
      clearInterval(this.activeSession.intervalId);
    }

    this.activeSession.intervalId = setInterval(() => {
      this.updateSessionDisplay();
    }, 1000);
  }

  updateSessionDisplay() {
    if (!this.activeSession || this.activeSession.isPaused) return;

    const now = new Date();
    const elapsed = now.getTime() - this.activeSession.startTime.getTime() - this.activeSession.totalPausedTime;
    const seconds = Math.floor(elapsed / 1000);
    
    const display = document.getElementById('session-elapsed-time');
    if (display) {
      display.textContent = this.formatTime(seconds);
    }
  }

  toggleSessionPause() {
    if (!this.activeSession) return;

    const pauseBtn = document.getElementById('session-pause-btn');
    
    if (this.activeSession.isPaused) {
      // Resume
      const pauseDuration = new Date().getTime() - this.activeSession.lastPauseTime.getTime();
      this.activeSession.totalPausedTime += pauseDuration;
      this.activeSession.isPaused = false;
      this.activeSession.lastPauseTime = null;
      this.startSessionTimer();
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

  showSessionEndModal() {
    if (!this.activeSession) return;

    const modal = document.getElementById('session-notes-modal');
    const topicName = document.getElementById('summary-topic-name');
    const duration = document.getElementById('summary-duration');
    
    const elapsed = this.getSessionDuration();
    const minutes = Math.floor(elapsed / 60000);
    
    if (topicName) topicName.textContent = this.activeSession.topicName;
    if (duration) duration.textContent = `${minutes} minutos`;
    
    modal?.classList.remove('hidden');
  }

  hideSessionEndModal() {
    document.getElementById('session-notes-modal')?.classList.add('hidden');
  }

  getSessionDuration() {
    if (!this.activeSession) return 0;
    
    const now = new Date();
    let elapsed = now.getTime() - this.activeSession.startTime.getTime() - this.activeSession.totalPausedTime;
    
    // If currently paused, don't count the current pause
    if (this.activeSession.isPaused && this.activeSession.lastPauseTime) {
      // The elapsed time is already correct since we don't update totalPausedTime until resume
    }
    
    return elapsed;
  }

  async saveAndEndSession() {
    if (!this.activeSession) return;

    try {
      const notes = document.getElementById('session-quick-notes')?.value.trim() || '';
      const elapsed = this.getSessionDuration();
      const durationInSeconds = Math.floor(elapsed / 1000);

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
      if (this.currentSection === 'dashboard') {
        this.navigateToSection('dashboard');
      }
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Erro ao salvar sessão. Tente novamente.');
    }
  }

  discardSession() {
    this.endSession();
  }

  endSession() {
    if (this.activeSession?.intervalId) {
      clearInterval(this.activeSession.intervalId);
    }
    
    this.activeSession = null;
    this.hideSessionPanel();
    this.hideSessionEndModal();
    
    // Clear quick notes
    const notesField = document.getElementById('session-quick-notes');
    if (notesField) notesField.value = '';
  }

  maximizeSession() {
    if (!this.activeSession) return;

    if (this.activeSession.bookId) {
      this.navigateToSection('books', { detailId: this.activeSession.bookId });
    } else {
      this.navigateToSection('topics', { detailId: this.activeSession.topicId });
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(this.auth, provider);
      console.log('User signed in:', result.user);
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Erro ao fazer login. Tente novamente.');
    }
  }

  async logout() {
    try {
      if (this.activeSession) {
        this.discardSession();
      }
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Utility methods
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  static formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  static formatDateTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  showSessionMusicModal() {
    document.getElementById('session-music-modal')?.classList.remove('hidden');
  }

  hideSessionMusicModal() {
    document.getElementById('session-music-modal')?.classList.add('hidden');
  }

  loadSessionMusic() {
    const url = document.getElementById('session-youtube-link').value.trim();
    if (!url) return;

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      alert('URL do YouTube inválida. Tente novamente.');
      return;
    }

    this.loadSessionVideo(videoId);
  }

  loadSessionPreset(videoId) {
    this.loadSessionVideo(videoId);
  }

  loadSessionVideo(videoId) {
    const iframe = document.getElementById('session-youtube-iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${videoId}`;
    document.getElementById('session-video-container').style.display = 'block';
  }

  extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});