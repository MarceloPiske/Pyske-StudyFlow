import { FormBuilder } from '../shared/form-builder.js';
import { UIUtils } from '../../utils/ui-utils.js';
import { DateUtils } from '../../utils/date-utils.js';
import { Modal } from '../shared/Modal.js';

export class TopicForm {
  constructor(props) {
    this.topics = props.topics || [];
    this.onSave = props.onSave;
    this.onCancel = props.onCancel;
    this.element = null;
    this.hierarchyModal = null;
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
    `;
  }

  renderParentOptions() {
    const options = ['<option value="">Tópico Principal</option>'];
    
    const buildHierarchicalOptions = (topics, level = 0) => {
      topics.forEach(topic => {
        const indent = '&nbsp;'.repeat(level * 4);
        options.push(`<option value="${topic.id}">${indent}${topic.name}</option>`);
        
        const children = this.topics.filter(t => t.parentId === topic.id);
        if (children.length > 0) {
          buildHierarchicalOptions(children, level + 1);
        }
      });
    };
    
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    buildHierarchicalOptions(rootTopics);
    
    return options.join('');
  }

  setupListeners() {
    if (!this.element) return;
    
    const form = this.element.querySelector('#topic-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    const cancelBtn = this.element.querySelector('#cancel-topic');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.clear();
        if (this.onCancel) this.onCancel();
      });
    }

    const hierarchyBtn = this.element.querySelector('#create-hierarchy-btn');
    if (hierarchyBtn) {
      hierarchyBtn.addEventListener('click', () => {
        this.showHierarchyModal();
      });
    }
  }

  async handleSubmit() {
    const submitBtn = this.element.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
      const topicId = this.element.querySelector('#topic-id')?.value;
      const name = this.element.querySelector('#topic-name')?.value.trim();
      const parentId = this.element.querySelector('#topic-parent')?.value || null;
      const proficiency = this.element.querySelector('#topic-proficiency')?.value;
      const status = this.element.querySelector('#topic-status')?.value;
      const priority = this.element.querySelector('#topic-priority')?.value;
      const dueDate = this.element.querySelector('#topic-due-date')?.value;
      
      if (!name) {
        alert('Nome do tópico é obrigatório.');
        return;
      }
      
      const topicData = {
        name,
        parentId,
        proficiency,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null
      };
      
      if (topicId) {
        await window.app.firestoreService.updateDocument('topics', topicId, topicData);
      } else {
        await window.app.firestoreService.createDocument('topics', topicData);
      }
      
      this.clear();
      await window.app.refreshDataAndReRender('topics');
      
      if (this.onSave) this.onSave();
      
    } catch (error) {
      console.error('Error saving topic:', error);
      alert('Erro ao salvar tópico. Tente novamente.');
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  showHierarchyModal() {
    if (!this.hierarchyModal) {
      const modalContent = `
        <p class="form-label">Digite os tópicos em ordem hierárquica (um por linha):</p>
        <textarea id="hierarchy-input" class="form-input" rows="6" placeholder="Exemplo:&#10;Teologia&#10;Sistemática&#10;Cristologia"></textarea>
        <div class="form-actions">
          <button id="create-hierarchy" class="btn btn-primary">
            <span class="btn-text">Criar Hierarquia</span>
            <span class="btn-loading hidden">Criando...</span>
          </button>
          <button id="cancel-hierarchy" class="btn btn-secondary">Cancelar</button>
        </div>
      `;
      
      this.hierarchyModal = new Modal({
        id: 'hierarchy-modal',
        title: 'Criar Hierarquia de Tópicos',
        content: modalContent
      });
      
      this.hierarchyModal.mount('body');
      
      // Setup hierarchy modal listeners
      const createBtn = document.getElementById('create-hierarchy');
      const cancelBtn = document.getElementById('cancel-hierarchy');
      
      if (createBtn) {
        createBtn.addEventListener('click', () => this.createHierarchy());
      }
      
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.hierarchyModal.hide());
      }
    }
    
    this.hierarchyModal.show();
  }

  async createHierarchy() {
    const submitBtn = document.getElementById('create-hierarchy');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    
    try {
      const input = document.getElementById('hierarchy-input');
      if (!input) return;
      
      const inputValue = input.value.trim();
      if (!inputValue) return;
      
      const topicNames = inputValue.split('\\n').map(name => name.trim()).filter(name => name);
      if (topicNames.length === 0) return;
      
      let parentId = null;
      
      for (const topicName of topicNames) {
        const existingTopic = this.topics.find(t => 
          t.name.toLowerCase() === topicName.toLowerCase() && t.parentId === parentId
        );
        
        if (existingTopic) {
          parentId = existingTopic.id;
          continue;
        }
        
        const topicData = {
          name: topicName,
          parentId,
          proficiency: 'Iniciante',
          status: 'Não Iniciado',
          priority: 'Média',
          dueDate: null
        };
        
        const newTopic = await window.app.firestoreService.createDocument('topics', topicData);
        parentId = newTopic.id;
      }
      
      this.hierarchyModal.hide();
      await window.app.refreshDataAndReRender('topics');
      alert('Hierarquia de tópicos criada com sucesso!');
    } catch (error) {
      console.error('Error creating topic hierarchy:', error);
      alert('Erro ao criar hierarquia de tópicos.');
    } finally {
      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
    }
  }

  edit(topicId) {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return;
    
    const setFieldValue = (id, value) => {
      const field = this.element.querySelector(`#${id}`);
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
    const form = this.element.querySelector('#topic-form');
    if (form) {
      form.reset();
      const hiddenInput = this.element.querySelector('#topic-id');
      if (hiddenInput) hiddenInput.value = '';
    }
  }

  mount(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (container) {
      container.innerHTML = this.render();
      this.element = container;
      this.setupListeners();
    }
  }

  updateTopics(topics) {
    this.topics = topics;
    const parentSelect = this.element?.querySelector('#topic-parent');
    if (parentSelect) {
      const currentValue = parentSelect.value;
      parentSelect.innerHTML = this.renderParentOptions();
      parentSelect.value = currentValue;
    }
  }
}