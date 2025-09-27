import { FormBuilder } from '../components/form-builder.js';
import { UIUtils } from '../utils/ui-utils.js';
import { DateUtils } from '../utils/date-utils.js';

export class TopicForm {
  constructor(topics) {
    this.topics = topics;
  }

  render() {
    return `
      <form id="topic-form" class="topic-form">
        <input type="hidden" id="topic-id">
        
        <div class="form-group">
          <label class="form-label">Nome do Tópico</label>
          <input type="text" id="topic-name" class="form-input" placeholder="Ex: Teologia Sistemática" required>
        </div>

        <div class="form-group">
          <label class="form-label">Tópico Pai (Opcional)</label>
          <select id="topic-parent" class="form-input">
            ${this.renderParentOptions()}
          </select>
          <div class="quick-hierarchy-actions">
            <button type="button" id="create-hierarchy-btn" class="btn btn-secondary btn-sm">
              <span class="material-icons">account_tree</span> Criar Hierarquia Rápida
            </button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nível de Proficiência</label>
            <select id="topic-proficiency" class="form-input">
              <option value="Iniciante">Iniciante</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Avançado">Avançado</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="topic-status" class="form-input">
              <option value="Não Iniciado">Não Iniciado</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select id="topic-priority" class="form-input">
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data Limite (Opcional)</label>
            <input type="date" id="topic-due-date" class="form-input">
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <span class="btn-text">Salvar</span>
            <span class="btn-loading hidden">Salvando...</span>
          </button>
          <button type="button" id="cancel-topic" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>

      <!-- Quick Hierarchy Modal -->
      <div id="hierarchy-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Criar Hierarquia de Tópicos</h2>
            <button id="close-hierarchy-modal" class="btn-close"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <p class="form-label">Digite os tópicos em ordem hierárquica (um por linha):</p>
            <textarea id="hierarchy-input" class="form-input" rows="6" placeholder="Exemplo:&#10;Teologia&#10;Sistemática&#10;Cristologia"></textarea>
            <div class="form-actions">
              <button id="create-hierarchy" class="btn btn-primary">
                <span class="btn-text">Criar Hierarquia</span>
                <span class="btn-loading hidden">Criando...</span>
              </button>
              <button id="cancel-hierarchy" class="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderParentOptions() {
    const options = ['<option value="">Tópico Principal</option>'];
    
    // Build hierarchical options
    const buildHierarchicalOptions = (topics, level = 0) => {
      topics.forEach(topic => {
        const indent = '&nbsp;'.repeat(level * 4);
        options.push(`<option value="${topic.id}">${indent}${topic.name}</option>`);
        
        // Add children
        const children = this.topics.filter(t => t.parentId === topic.id);
        if (children.length > 0) {
          buildHierarchicalOptions(children, level + 1);
        }
      });
    };
    
    // Start with root topics
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    buildHierarchicalOptions(rootTopics);
    
    return options.join('');
  }

  updateTopics(topics) {
    this.topics = topics;
    // Update parent selector if it exists
    const parentSelect = document.getElementById('topic-parent');
    if (parentSelect) {
      const currentValue = parentSelect.value;
      parentSelect.innerHTML = this.renderParentOptions();
      parentSelect.value = currentValue;
    }
  }

  setupListeners(firestoreService) {
    // Form submission
    const form = document.getElementById('topic-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit(firestoreService);
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancel-topic');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.clear();
      });
    }

    // Quick hierarchy button
    const hierarchyBtn = document.getElementById('create-hierarchy-btn');
    if (hierarchyBtn) {
      hierarchyBtn.addEventListener('click', () => {
        this.showHierarchyModal();
      });
    }

    // Hierarchy modal events
    const closeModalBtn = document.getElementById('close-hierarchy-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        this.hideHierarchyModal();
      });
    }

    const cancelHierarchyBtn = document.getElementById('cancel-hierarchy');
    if (cancelHierarchyBtn) {
      cancelHierarchyBtn.addEventListener('click', () => {
        this.hideHierarchyModal();
      });
    }

    const createHierarchyBtn = document.getElementById('create-hierarchy');
    if (createHierarchyBtn) {
      createHierarchyBtn.addEventListener('click', () => {
        this.createHierarchy(firestoreService);
      });
    }
  }

  async handleSubmit(firestoreService) {
    const submitBtn = document.querySelector('#topic-form button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
      const topicId = document.getElementById('topic-id')?.value;
      const name = document.getElementById('topic-name')?.value.trim();
      const parentId = document.getElementById('topic-parent')?.value || null;
      const proficiency = document.getElementById('topic-proficiency')?.value;
      const status = document.getElementById('topic-status')?.value;
      const priority = document.getElementById('topic-priority')?.value;
      const dueDate = document.getElementById('topic-due-date')?.value;

      if (!name) {
        alert('Nome do tópico é obrigatório.');
        return;
      }

      const topicData = {
        name: name,
        parentId: parentId,
        proficiency: proficiency,
        status: status,
        priority: priority,
        dueDate: dueDate ? new Date(dueDate) : null
      };

      if (topicId) {
        await firestoreService.updateDocument('topics', topicId, topicData);
      } else {
        await firestoreService.createDocument('topics', topicData);
      }

      // Clear form
      this.clear();

      // Use new refresh method instead of full navigation
      await window.app.refreshDataAndReRender('topics');
      
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('Erro ao salvar tópico. Tente novamente.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  edit(topicId) {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return;

    // Populate form fields
    const setFieldValue = (id, value) => {
      const field = document.getElementById(id);
      if (field) field.value = value || '';
    };

    setFieldValue('topic-id', topic.id);
    setFieldValue('topic-name', topic.name);
    setFieldValue('topic-parent', topic.parentId);
    setFieldValue('topic-proficiency', topic.proficiency || 'Iniciante');
    setFieldValue('topic-status', topic.status || 'Não Iniciado');
    setFieldValue('topic-priority', topic.priority || 'Média');
    setFieldValue('topic-due-date', topic.dueDate ? DateUtils.formatTimeISO(topic.dueDate) : '');
  }

  clear() {
    const form = document.getElementById('topic-form');
    if (form) {
      form.reset();
      const hiddenInput = document.getElementById('topic-id');
      if (hiddenInput) hiddenInput.value = '';
    }
  }

  showHierarchyModal() {
    UIUtils.showModal('hierarchy-modal');
  }

  hideHierarchyModal() {
    UIUtils.hideModal('hierarchy-modal');
    const input = document.getElementById('hierarchy-input');
    if (input) input.value = '';
  }

  async createHierarchy(firestoreService) {
    const submitBtn = document.getElementById('create-hierarchy');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
      const input = document.getElementById('hierarchy-input');
      if (!input) return;

      const inputValue = input.value.trim();
      if (!inputValue) return;

      const topicNames = inputValue.split('\n').map(name => name.trim()).filter(name => name);
      if (topicNames.length === 0) return;

      let parentId = null;
      
      for (const topicName of topicNames) {
        // Check if topic already exists
        const existingTopic = this.topics.find(t => 
          t.name.toLowerCase() === topicName.toLowerCase() && t.parentId === parentId
        );

        if (existingTopic) {
          parentId = existingTopic.id;
          continue;
        }

        // Create new topic
        const topicData = {
          name: topicName,
          parentId: parentId,
          proficiency: 'Iniciante',
          status: 'Não Iniciado',
          priority: 'Média',
          dueDate: null
        };

        const newTopic = await firestoreService.createDocument('topics', topicData);
        parentId = newTopic.id;
      }

      this.hideHierarchyModal();
      
      // Use new refresh method instead of full navigation
      await window.app.refreshDataAndReRender('topics');
      
      alert('Hierarquia de tópicos criada com sucesso!');
    } catch (error) {
      console.error('Error creating topic hierarchy:', error);
      alert('Erro ao criar hierarquia de tópicos.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }
}