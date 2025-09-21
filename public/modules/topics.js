import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class TopicsModule {
  constructor(db, user) {
    this.db = db;
    this.user = user;
    this.topics = [];
    this.dataLoaded = false;
  }

  async ensureDataLoaded() {
    if (!this.dataLoaded) {
      await this.loadTopics();
    }
  }

  async render() {
    await this.ensureDataLoaded();
    
    return `
      <div class="topics-container">
        <div class="topics-header">
          <h1>Gestão de Tópicos</h1>
          <button id="add-topic-btn" class="btn btn-primary">
            <span>➕</span> Novo Tópico
          </button>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Árvore de Conhecimento</h3>
            </div>
            <div class="card-body">
              <div id="topics-tree" class="topics-tree">
                ${this.renderTopicsTree()}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Adicionar/Editar Tópico</h3>
            </div>
            <div class="card-body">
              <form id="topic-form" class="topic-form">
                <input type="hidden" id="topic-id">
                
                <div class="form-group">
                  <label class="form-label">Nome do Tópico</label>
                  <input type="text" id="topic-name" class="form-input" placeholder="Ex: Teologia Sistemática" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Tópico Pai (Opcional)</label>
                  <select id="topic-parent" class="form-input">
                    <option value="">Tópico Principal</option>
                    ${this.renderParentOptions()}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Nível de Proficiência</label>
                  <select id="topic-proficiency" class="form-input">
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Salvar</button>
                  <button type="button" id="cancel-topic" class="btn btn-secondary">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadTopics() {
    try {
      const topicsQuery = query(
        collection(this.db, 'topics'),
        where('userId', '==', this.user.uid),
        orderBy('name')
      );
      const snapshot = await getDocs(topicsQuery);
      
      this.topics = [];
      snapshot.forEach(doc => {
        this.topics.push({ id: doc.id, ...doc.data() });
      });
      
      this.dataLoaded = true;
      console.log('Topics loaded:', this.topics);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  }

  renderTopicsTree() {
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    return this.buildTreeHTML(rootTopics);
  }

  buildTreeHTML(topics, level = 0) {
    if (!topics.length) return '<p class="empty-state">Nenhum tópico criado ainda.</p>';

    return `
      <ul class="tree-list" style="margin-left: ${level * 20}px;">
        ${topics.map(topic => `
          <li class="tree-item">
            <div class="topic-item" data-topic-id="${topic.id}">
              <span class="topic-name">${topic.name}</span>
              <span class="topic-proficiency ${topic.proficiency?.toLowerCase()}">${topic.proficiency || 'Não definido'}</span>
              <div class="topic-actions">
                <button class="btn-edit" data-topic-id="${topic.id}">✏️</button>
                <button class="btn-delete" data-topic-id="${topic.id}">🗑️</button>
                <button class="btn-study" data-topic-id="${topic.id}" data-topic-name="${topic.name}">📚</button>
              </div>
            </div>
            ${this.buildTreeHTML(this.getChildTopics(topic.id), level + 1)}
          </li>
        `).join('')}
      </ul>
    `;
  }

  getChildTopics(parentId) {
    return this.topics.filter(topic => topic.parentId === parentId);
  }

  renderParentOptions() {
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    return rootTopics.map(topic => 
      `<option value="${topic.id}">${topic.name}</option>`
    ).join('');
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Add topic button
    document.getElementById('add-topic-btn')?.addEventListener('click', () => {
      this.clearForm();
    });

    // Form submission
    document.getElementById('topic-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Cancel button
    document.getElementById('cancel-topic')?.addEventListener('click', () => {
      this.clearForm();
    });

    // Tree actions
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit')) {
        const topicId = e.target.dataset.topicId;
        this.editTopic(topicId);
      } else if (e.target.classList.contains('btn-delete')) {
        const topicId = e.target.dataset.topicId;
        this.deleteTopic(topicId);
      } else if (e.target.classList.contains('btn-study')) {
        const topicId = e.target.dataset.topicId;
        const topicName = e.target.dataset.topicName;
        this.startStudySession(topicId, topicName);
      }
    });
  }

  async handleFormSubmit() {
    const topicId = document.getElementById('topic-id').value;
    const name = document.getElementById('topic-name').value.trim();
    const parentId = document.getElementById('topic-parent').value || null;
    const proficiency = document.getElementById('topic-proficiency').value;

    if (!name) return;

    try {
      const topicData = {
        name,
        parentId,
        proficiency,
        userId: this.user.uid
      };

      if (topicId) {
        await updateDoc(doc(this.db, 'topics', topicId), topicData);
      } else {
        topicData.createdAt = new Date();
        await addDoc(collection(this.db, 'topics'), topicData);
      }

      // Mark data as stale and reload
      this.dataLoaded = false;
      window.app.navigateToSection('topics');
    } catch (error) {
      console.error('Error saving topic:', error);
    }
  }

  editTopic(topicId) {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return;

    document.getElementById('topic-id').value = topic.id;
    document.getElementById('topic-name').value = topic.name;
    document.getElementById('topic-parent').value = topic.parentId || '';
    document.getElementById('topic-proficiency').value = topic.proficiency || 'Iniciante';
  }

  async deleteTopic(topicId) {
    if (!confirm('Tem certeza que deseja excluir este tópico?')) return;

    try {
      await deleteDoc(doc(this.db, 'topics', topicId));
      window.app.navigateToSection('topics');
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  }

  startStudySession(topicId, topicName) {
    window.app.timer.start(topicId, topicName);
  }

  clearForm() {
    document.getElementById('topic-form').reset();
    document.getElementById('topic-id').value = '';
  }
}