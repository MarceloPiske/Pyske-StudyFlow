// Import Firebase modules
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Import modules
import { DashboardModule } from './modules/dashboard.js';
import { TopicsModule } from './modules/topics.js';
import { BooksModule } from './modules/books.js';
import { NotesModule } from './modules/notes.js';
import { StudyModule } from './modules/study.js';
import { FocusModule } from './modules/focus.js';
import { TimerModule } from './modules/timer.js';

// Make Firestore functions globally available for modules
window.firestoreModules = {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
};

class StudyFlowApp {
  constructor() {
    this.currentUser = null;
    this.currentSection = 'dashboard';
    this.modules = {};
    this.timer = new TimerModule();
    
    this.init();
  }

  async init() {
    // Wait for Firebase to be ready
    while (!window.auth || !window.db) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Register service worker
    /* if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      } 
    } */

    // Initialize modules
    this.modules = {
      dashboard: new DashboardModule(),
      topics: new TopicsModule(),
      books: new BooksModule(),
      notes: new NotesModule(),
      study: new StudyModule(),
      focus: new FocusModule()
    };

    // Set up auth listener with error handling
    try {
      onAuthStateChanged(window.auth, (user) => {
        this.handleAuthChange(user);
      }, (error) => {
        console.error('Auth state change error:', error);
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
    }

    // Set up event listeners
    this.setupEventListeners();

    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
    }, 1000);
  }

  setupEventListeners() {
    // Google login
    document.getElementById('google-login').addEventListener('click', () => {
      this.signInWithGoogle();
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.navigateToSection(section);
      });
    });

    // Timer controls
    document.getElementById('pause-timer').addEventListener('click', () => {
      this.timer.pause();
    });

    document.getElementById('stop-timer').addEventListener('click', () => {
      this.timer.stop();
    });
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(window.auth, provider);
      console.log('User signed in:', result.user);
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Erro ao fazer login. Tente novamente.');
    }
  }

  async logout() {
    try {
      await signOut(window.auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  handleAuthChange(user) {
    if (user) {
      this.currentUser = user;
      document.getElementById('auth-container').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      
      // Update user info
      document.getElementById('user-avatar').src = user.photoURL || '/default-avatar.png';
      
      // Load initial section
      this.navigateToSection('dashboard');
    } else {
      this.currentUser = null;
      document.getElementById('app').classList.add('hidden');
      document.getElementById('auth-container').classList.remove('hidden');
    }
  }

  navigateToSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update current section
    this.currentSection = section;

    // Load section content
    this.loadSectionContent(section);
  }

  async loadSectionContent(section) {
    const mainContent = document.getElementById('main-content');
    
    try {
      const module = this.modules[section];
      if (module) {
        const content = await module.render(this.currentUser);
        mainContent.innerHTML = content;
        
        // Initialize section-specific functionality
        if (module.init) {
          module.init();
        }
      }
    } catch (error) {
      console.error(`Error loading ${section}:`, error);
      mainContent.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h2>Erro ao carregar seção</h2>
            <p>Ocorreu um erro ao carregar esta seção. Tente novamente.</p>
          </div>
        </div>
      `;
    }
  }

  // Utility methods
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new StudyFlowApp();
});