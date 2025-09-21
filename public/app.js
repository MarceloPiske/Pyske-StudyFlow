// Import Firebase modules
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

// Import modules
import { DashboardModule } from './modules/dashboard.js';
import { TopicsModule } from './modules/topics.js';
import { BooksModule } from './modules/books.js';
import { NotesModule } from './modules/notes.js';
import { StudyModule } from './modules/study.js';
import { FocusModule } from './modules/focus.js';
import { TimerModule } from './modules/timer.js';

class App {
  constructor() {
    // Firebase references (set by index.html)
    this.auth = window.auth;
    this.db = window.db;
    
    this.user = null;
    this.currentSection = 'dashboard';
    
    // Module instances
    this.modules = {};
    this.timer = null;
    
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

  initApp() {
    // Initialize timer module
    this.timer = new TimerModule(this.db, this.user);
    
    // Initialize all modules with dependencies
    this.modules = {
      dashboard: new DashboardModule(this.db, this.user),
      topics: new TopicsModule(this.db, this.user),
      books: new BooksModule(this.db, this.user),
      notes: new NotesModule(this.db, this.user),
      study: new StudyModule(this.db, this.user),
      focus: new FocusModule(this.db, this.user)
    };

    // Update user info
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
      userAvatar.src = this.user.photoURL || '/default-avatar.png';
    }

    // Setup event listeners
    this.setupAppEventListeners();
    
    // Load initial section
    this.navigateToSection('dashboard');
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

    // Timer controls
    const pauseBtn = document.getElementById('pause-timer');
    const stopBtn = document.getElementById('stop-timer');
    
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.timer?.pause());
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.timer?.stop());
    }
  }

  async navigateToSection(sectionId) {
    console.log(`Navigating to: ${sectionId}`);
    
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

      // Handle module orchestration and data dependencies
      switch (sectionId) {
        case 'dashboard':
          html = await module.render(this.user);
          break;
          
        case 'topics':
          html = await module.render(this.user);
          break;
          
        case 'books':
          // Books need topics data for relationships
          await this.modules.topics.ensureDataLoaded();
          html = await module.render(this.modules.topics.topics);
          break;
          
        case 'notes':
          // Notes need both topics and books data
          await Promise.all([
            this.modules.topics.ensureDataLoaded(),
            this.modules.books.ensureDataLoaded()
          ]);
          html = await module.render(
            this.user
          );
          break;
          
        case 'study':
          // Study needs topics for selection
          await this.modules.topics.ensureDataLoaded();
          html = await module.render(this.user);
          break;
          
        case 'focus':
          // Focus needs topics for selection
          await this.modules.topics.ensureDataLoaded();
          html = await module.render(this.user);
          break;
          
        default:
          html = await module.render();
      }

      // Render content
      mainContent.innerHTML = html;
      
      // Initialize module functionality
      if (module.init) {
        module.init();
      }

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
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Utility methods for modules to use
  static formatTime(seconds) {
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});