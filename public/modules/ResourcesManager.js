import { UIUtils } from '../utils/ui-utils.js';
import { DateUtils } from '../utils/date-utils.js';
import { FormBuilder } from '../components/form-builder.js';

export class ResourcesManager {
  constructor() {
    this.resources = [];
  }

  render(topic, resources) {
    this.topic = topic;
    this.resources = resources;

    return `
      <div class="resources-container">
        <div class="resources-header">
          <div class="resources-filters">
            <button class="filter-btn active" data-filter="all">Todos</button>
            <button class="filter-btn" data-filter="internal_note">Notas</button>
            <button class="filter-btn" data-filter="web_article">Artigos</button>
            <button class="filter-btn" data-filter="google_doc">Docs</button>
            <button class="filter-btn" data-filter="drive_pdf">PDFs</button>
          </div>
          <button id="add-resource-btn" class="btn btn-primary" data-topic-id="${topic.id}">
            <span class="material-icons">add</span> Novo Recurso
          </button>
        </div>

        <div class="resources-grid" id="resources-grid">
          ${this.renderResourcesList(resources)}
        </div>

        <!-- Resource Form Modal -->
        ${this.renderResourceModal(topic)}
      </div>
    `;
  }

  renderResourcesList(resources) {
    if (!resources.length) {
      return '<div class="empty-state">Nenhum recurso adicionado ainda.</div>';
    }

    return resources.map(resource => `
      <div class="card resource-card" data-resource-type="${resource.type}">
        <div class="card-header">
          <div class="resource-type-icon">
            ${this.getResourceTypeIcon(resource.type)}
          </div>
          <h4 class="card-title">${resource.title}</h4>
          <div class="resource-actions">
            <button class="btn-edit-resource" data-resource-id="${resource.id}"><span class="material-icons small">edit</span></button>
            <button class="btn-delete-resource" data-resource-id="${resource.id}"><span class="material-icons small">delete</span></button>
          </div>
        </div>
        <div class="card-body">
          ${resource.source ? `<p class="resource-source">Fonte: ${resource.source}</p>` : ''}
          ${resource.personal_summary ? `<p class="resource-summary">${resource.personal_summary}</p>` : ''}
          ${resource.type !== 'internal_note' ? `
            <a href="${resource.content}" target="_blank" class="resource-link">
              <span class="material-icons small">open_in_new</span> Abrir
            </a>
          ` : ''}
          <div class="resource-meta">
            <span class="resource-date">${DateUtils.formatDate(resource.createdAt)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderResourceModal(topic) {
    return `
      <div id="resource-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Adicionar/Editar Recurso</h2>
            <button id="close-resource-modal" class="btn-close"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            <form id="resource-form">
              <input type="hidden" id="resource-id">
              <input type="hidden" id="resource-topic-id" value="${topic.id}">

              <div class="form-group">
                <label class="form-label">Tipo de Recurso</label>
                <select id="resource-type" class="form-input">
                  <option value="internal_note">Nota Interna</option>
                  <option value="web_article">Artigo Web</option>
                  <option value="google_doc">Google Docs</option>
                  <option value="drive_pdf">PDF do Drive</option>
                  <option value="youtube_video">Vídeo YouTube</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Título</label>
                <input type="text" id="resource-title" class="form-input" required>
              </div>

              <div class="form-group" id="content-group">
                <label class="form-label">Conteúdo/Link</label>
                <div id="note-editor" class="note-editor" contenteditable="true" placeholder="Escreva sua nota aqui..."></div>
                <input type="url" id="resource-url" class="form-input hidden" placeholder="Cole o link aqui...">
              </div>

              <div class="form-group">
                <label class="form-label">Fonte (opcional)</label>
                <input type="text" id="resource-source" class="form-input" placeholder="Ex: Stanford Encyclopedia, autor, site">
              </div>

              <div class="form-group">
                <label class="form-label">Seu Resumo Pessoal</label>
                <textarea id="resource-summary" class="form-input" rows="4" placeholder="Principais ideias, conexões, insights..."></textarea>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Salvar</button>
                <button type="button" id="cancel-resource" class="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  getResourceTypeIcon(type) {
    const icons = {
      'internal_note': '<span class="material-icons">edit_note</span>',
      'web_article': '<span class="material-icons">article</span>',
      'google_doc': '<span class="material-icons">description</span>',
      'drive_pdf': '<span class="material-icons">picture_as_pdf</span>',
      'youtube_video': '<span class="material-icons">smart_display</span>'
    };
    return icons[type] || '<span class="material-icons">insert_drive_file</span>';
  }

  setupListeners(firestoreService) {
    // Add resource button
    document.getElementById('add-resource-btn')?.addEventListener('click', () => {
      this.showModal();
    });

    // Resource type change
    document.getElementById('resource-type')?.addEventListener('change', (e) => {
      this.toggleInput(e.target.value);
    });

    // Resource form submission
    document.getElementById('resource-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(firestoreService);
    });

    // Modal controls
    document.getElementById('close-resource-modal')?.addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('cancel-resource')?.addEventListener('click', () => {
      this.hideModal();
    });

    // Resource filters
    document.querySelectorAll('.resources-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.resources-filters .filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filter(e.target.dataset.filter);
      });
    });

    // Resource actions (delegated)
    document.getElementById('resources-grid')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-resource');
      const deleteBtn = e.target.closest('.btn-delete-resource');
      if (editBtn) {
        this.edit(editBtn.dataset.resourceId);
      } else if (deleteBtn) {
        this.delete(deleteBtn.dataset.resourceId, firestoreService);
      }
    });
  }

  showModal(prefillData = null) {
    this.clearForm();
    if (prefillData) {
        document.getElementById('resource-title').value = prefillData.title;
        document.getElementById('resource-type').value = prefillData.type;
        this.toggleInput(prefillData.type);
        if (prefillData.type === 'internal_note') {
            document.getElementById('note-editor').innerHTML = prefillData.content.replace(/\\n/g, '<br>');
        }
        document.getElementById('resource-source').value = prefillData.source;
    }
    UIUtils.showModal('resource-modal');
  }

  hideModal() {
    UIUtils.hideModal('resource-modal');
  }

  toggleInput(type) {
    const editor = document.getElementById('note-editor');
    const urlInput = document.getElementById('resource-url');

    if (type === 'internal_note') {
      editor.classList.remove('hidden');
      urlInput.classList.add('hidden');
      urlInput.required = false;
    } else {
      editor.classList.add('hidden');
      urlInput.classList.remove('hidden');
      urlInput.required = true;
    }
  }

  async handleSubmit(firestoreService) {
    const submitBtn = document.querySelector('#resource-form button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text') || submitBtn;
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Show loading state if elements exist
    if (btnLoading) {
      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnLoading.classList.remove('hidden');
    } else {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';
    }

    try {
      const resourceId = document.getElementById('resource-id').value;
      const topicId = document.getElementById('resource-topic-id').value;

      const type = document.getElementById('resource-type').value;
      const title = document.getElementById('resource-title').value.trim();
      const source = document.getElementById('resource-source').value.trim();
      const summary = document.getElementById('resource-summary').value.trim();
      
      let content;
      if (type === 'internal_note') {
        content = document.getElementById('note-editor').innerHTML;
      } else {
        content = document.getElementById('resource-url').value;
      }

      if (!title || !content) {
          alert('Título e Conteúdo/Link são obrigatórios.');
          return;
      }

      const resourceData = {
        title: title,
        type: type,
        content,
        source: source || null,
        personal_summary: summary || null,
        primaryTopicId: topicId,
        associatedTopicIds: [topicId],
        associatedBookIds: []
      };

      if (resourceId) {
        await firestoreService.updateDocument('resources', resourceId, resourceData);
      } else {
        await firestoreService.createDocument('resources', resourceData);
      }

      this.hideModal();
      // Use new refresh method
      await window.app.refreshDataAndReRender('topics');
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Erro ao salvar recurso.');
    } finally {
      // Reset button state
      if (btnLoading) {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
      }
    }
  }

  filter(filterType) {
    const resourceCards = document.querySelectorAll('.resource-card');
    
    resourceCards.forEach(card => {
      const show = filterType === 'all' || card.dataset.resourceType === filterType;
      card.style.display = show ? 'block' : 'none';
    });
  }

  clearForm() {
    UIUtils.clearForm('resource-form');
    const editor = document.getElementById('note-editor');
    if (editor) editor.innerHTML = '';
    const urlInput = document.getElementById('resource-url');
    if(urlInput) urlInput.value = '';
    this.toggleInput('internal_note');
  }

  edit(resourceId) {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) return;

    this.clearForm();
    document.getElementById('resource-id').value = resource.id;
    document.getElementById('resource-title').value = resource.title;
    document.getElementById('resource-type').value = resource.type;
    document.getElementById('resource-source').value = resource.source || '';
    document.getElementById('resource-summary').value = resource.personal_summary || '';
    
    this.toggleInput(resource.type);
    if (resource.type === 'internal_note') {
        document.getElementById('note-editor').innerHTML = resource.content;
    } else {
        document.getElementById('resource-url').value = resource.content;
    }

    this.showModal();
  }

  async delete(resourceId, firestoreService) {
    if (!confirm('Tem certeza que deseja excluir este recurso?')) return;

    try {
      await firestoreService.deleteDocument('resources', resourceId);
      // Use new refresh method
      await window.app.refreshDataAndReRender('topics');
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Erro ao excluir recurso.');
    }
  }
}