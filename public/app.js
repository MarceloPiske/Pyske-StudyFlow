// Import Firebase modules
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

// Import page components
import { DashboardModule } from './modules/dashboard.js';
import { TopicPage } from './components/topics/TopicPage.js';
import { BooksModule } from './modules/books.js';
import { ArticlesModule } from './modules/articles.js';
import { PrioritiesModule } from './modules/priorities.js';
import { FirestoreService } from './services/firestore-service.js';
import { SessionManager } from './services/session-manager.js';

class App {
  constructor() {
    // Firebase references (set by index.html)
    this.auth = window.auth;
    this.db = window.db;
    
    this.user = null;
    this.currentSection = 'dashboard';
    this.currentDetailId = null;
    
    // ===== CENTRALIZED STATE - SINGLE SOURCE OF TRUTH =====
    this.allTopics = [];
    this.allBooks = [];
    this.allResources = [];
    this.priorityQueueIds = [];
    this.firestoreService = null;
    // ======================================================
    
    // Session management
    this.sessionManager = null;
    
    // Page components (new architecture)
    this.pageComponents = {};
    
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

    // Initialize session manager
    this.sessionManager = new SessionManager(this.db, this.user);

    // Initialize page components (new architecture)
    this.pageComponents = {
      dashboard: new DashboardModule(), // Keep as module for now
      topics: null, // Will be created dynamically with props
      books: new BooksModule(), // Keep as module for now
      articles: new ArticlesModule(), // Keep as module for now
      priorities: new PrioritiesModule() // Keep as module for now
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
    
    // Load initial section
    this.navigateToSection('dashboard');
  }

  async loadCentralizedData() {
    try {
      const [topics, books, resources, priorities] = await Promise.all([
        this.firestoreService.getCollection('topics', 'name', 'asc'),
        this.firestoreService.getCollection('books', 'createdAt', 'desc'),
        this.firestoreService.getCollection('resources', 'createdAt', 'desc'),
        this.firestoreService.getUserDocument('settings/priorities')
      ]);
      
      this.allTopics = topics;
      this.allBooks = books;
      this.allResources = resources;
      this.priorityQueueIds = priorities?.queue || [];
      
      console.log("Central state loaded:", { 
        topics: this.allTopics.length, 
        books: this.allBooks.length,
        resources: this.allResources.length,
        priorityQueue: this.priorityQueueIds.length
      });
    } catch (error) {
      console.error("Error loading central data:", error);
      this.allTopics = [];
      this.allBooks = [];
      this.allResources = [];
      this.priorityQueueIds = [];
    }
  }

  async refreshData(dataType = 'all') {
    try {
      if (dataType === 'all' || dataType === 'topics') {
        this.allTopics = await this.firestoreService.getCollection('topics', 'name', 'asc');
      }
      if (dataType === 'all' || dataType === 'books') {
        this.allBooks = await this.firestoreService.getCollection('books', 'createdAt', 'desc');
      }
      if (dataType === 'all' || dataType === 'resources' || dataType === 'articles') {
        this.allResources = await this.firestoreService.getCollection('resources', 'createdAt', 'desc');
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

  async refreshDataAndReRender(dataType = 'all') {
    await this.refreshData(dataType);
    
    if (this.currentDetailId) {
      await this.navigateToSection(this.currentSection, { detailId: this.currentDetailId });
    } else {
      await this.navigateToSection(this.currentSection);
    }
  }

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
    this.currentDetailId = options.detailId || null;
    const mainContent = document.getElementById('main-content');
    
    // Show loading state
    mainContent.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>Carregando...</p></div>';

    try {
      let pageComponent;

      // Create page component with props
      switch (sectionId) {
        case 'topics':
          pageComponent = new TopicPage({
            topics: this.allTopics,
            firestoreService: this.firestoreService,
            detailId: options.detailId
          });
          break;
          
        case 'dashboard':
          pageComponent = this.pageComponents.dashboard;
          break;
          
        case 'books':
          pageComponent = this.pageComponents.books;
          break;
          
        case 'articles':
          pageComponent = this.pageComponents.articles;
          break;
          
        case 'priorities':
          pageComponent = this.pageComponents.priorities;
          break;
          
        default:
          throw new Error(`Section ${sectionId} not found`);
      }

      // Handle new component architecture vs old module architecture
      if (pageComponent && pageComponent.mount) {
        // New component architecture
        pageComponent.mount('#main-content');
      } else {
        // Old module architecture (for sections not yet refactored)
        let html;

        if (options.detailId) {
          switch (sectionId) {
            case 'books':
              html = await pageComponent.renderDetailView(options.detailId, this.allTopics, this.firestoreService);
              break;
            default:
              html = await pageComponent.renderDetailView(options.detailId, this.firestoreService);
          }
          
          if (pageComponent.initDetailViewListeners) {
            setTimeout(() => pageComponent.initDetailViewListeners(this.firestoreService), 100);
          }
        } else {
          switch (sectionId) {
            case 'dashboard':
              html = await pageComponent.render(this.allTopics, this.allBooks, this.firestoreService);
              break;
            case 'books':
              html = await pageComponent.render(this.allTopics, this.allBooks);
              break;
            case 'articles':
              html = await pageComponent.render(this.allTopics, this.allResources);
              break;
            case 'priorities':
              const priorityQueueTopics = this.priorityQueueIds
                .map(id => this.allTopics.find(t => t.id === id))
                .filter(Boolean);
              html = await pageComponent.render(this.allTopics, priorityQueueTopics, this.priorityQueueIds);
              break;
            default:
              html = await pageComponent.render();
          }

          if (pageComponent.initListViewListeners) {
            setTimeout(() => pageComponent.initListViewListeners(this.firestoreService), 100);
          } else if (pageComponent.init) {
            setTimeout(() => pageComponent.init(this.firestoreService), 100);
          }
        }

        mainContent.innerHTML = html;
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

  // Session Management Methods (delegated to SessionManager)
  startStudySession(topicId, topicName, bookId = null, sessionType = 'study') {
    if (this._startingSession) {
      console.log('Session start already in progress, ignoring duplicate call');
      return;
    }
    
    this._startingSession = true;
    
    try {
      this.sessionManager.startSession(topicId, topicName, bookId, sessionType);
    } finally {
      setTimeout(() => {
        this._startingSession = false;
      }, 1000);
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
      if (this.sessionManager?.hasActiveSession()) {
        this.sessionManager.discardSession();
      }
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
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