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

        <!-- Resource Form Modal is now managed by ModalManager -->
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

  setupListeners() {
    // Add resource button
    document.getElementById('add-resource-btn')?.addEventListener('click', () => {
      this.showResourceFormModal();
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
        this.delete(deleteBtn.dataset.resourceId, window.app.firestoreService);
      }
    });
  }

  showResourceFormModal(resourceId = null, prefillData = null) {
    const resource = resourceId ? this.resources.find(r => r.id === resourceId) : null;
    const data = resource || prefillData;
    const title = resource ? 'Editar Recurso' : 'Adicionar Recurso';

    const content = `
      <form id="resource-form">
        <input type="hidden" id="resource-id" value="${data?.id || ''}">
        <input type="hidden" id="resource-topic-id" value="${this.topic.id}">

        <div class="form-group">
          <label class="form-label">Tipo de Recurso</label>
          <select id="resource-type" class="form-input">
            <option value="internal_note" ${data?.type === 'internal_note' ? 'selected' : ''}>Nota Interna</option>
            <option value="web_article" ${data?.type === 'web_article' ? 'selected' : ''}>Artigo Web</option>
            <option value="google_doc" ${data?.type === 'google_doc' ? 'selected' : ''}>Google Docs</option>
            <option value="drive_pdf" ${data?.type === 'drive_pdf' ? 'selected' : ''}>PDF do Drive</option>
            <option value="youtube_video" ${data?.type === 'youtube_video' ? 'selected' : ''}>Vídeo YouTube</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Título</label>
          <input type="text" id="resource-title" class="form-input" value="${data?.title || ''}" required>
        </div>

        <div class="form-group" id="content-group">
          <label class="form-label">Conteúdo/Link</label>
          <div id="note-editor" class="note-editor" contenteditable="true" placeholder="Escreva sua nota aqui...">${(data?.type === 'internal_note' && data.content) ? data.content.replace(/\n/g, '<br>') : ''}</div>
          <input type="url" id="resource-url" class="form-input hidden" placeholder="Cole o link aqui..." value="${data?.type !== 'internal_note' ? (data?.content || '') : ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Fonte (opcional)</label>
          <input type="text" id="resource-source" class="form-input" placeholder="Ex: Stanford Encyclopedia, autor, site" value="${data?.source || ''}">
        </div>

        <div class="form-group">
          <label class="form-label">Seu Resumo Pessoal</label>
          <textarea id="resource-summary" class="form-input" rows="4" placeholder="Principais ideias, conexões, insights...">${data?.personal_summary || ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Salvar</button>
          <button type="button" id="cancel-resource" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    window.app.modalManager.show({
      title,
      content,
      onMount: (modalElement) => {
        const form = modalElement.querySelector('#resource-form');
        const typeSelect = modalElement.querySelector('#resource-type');

        const toggleInput = (type) => {
          const editor = modalElement.querySelector('#note-editor');
          const urlInput = modalElement.querySelector('#resource-url');
          if (type === 'internal_note') {
            editor.classList.remove('hidden');
            urlInput.classList.add('hidden');
            urlInput.required = false;
          } else {
            editor.classList.add('hidden');
            urlInput.classList.remove('hidden');
            urlInput.required = true;
          }
        };

        toggleInput(typeSelect.value); // Initial state

        typeSelect.addEventListener('change', (e) => toggleInput(e.target.value));

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSubmit(modalElement);
        });

        modalElement.querySelector('#cancel-resource').addEventListener('click', () => {
          window.app.modalManager.hide();
        });
      }
    });
  }

  async handleSubmit(modalElement) {
    const submitBtn = modalElement.querySelector('#resource-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    try {
      const firestoreService = window.app.firestoreService;
      const resourceId = modalElement.querySelector('#resource-id').value;
      const topicId = modalElement.querySelector('#resource-topic-id').value;

      const type = modalElement.querySelector('#resource-type').value;
      const title = modalElement.querySelector('#resource-title').value.trim();
      const source = modalElement.querySelector('#resource-source').value.trim();
      const summary = modalElement.querySelector('#resource-summary').value.trim();
      
      let content;
      if (type === 'internal_note') {
        content = modalElement.querySelector('#note-editor').innerHTML;
      } else {
        content = modalElement.querySelector('#resource-url').value;
      }

      if (!title || !content) {
          alert('Título e Conteúdo/Link são obrigatórios.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
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

      window.app.modalManager.hide();
      // Use new refresh method
      await window.app.refreshDataAndReRender('topics');
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Erro ao salvar recurso.');
    } finally {
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  filter(filterType) {
    const resourceCards = document.querySelectorAll('.resource-card');
    
    resourceCards.forEach(card => {
      const show = filterType === 'all' || card.dataset.resourceType === filterType;
      card.style.display = show ? 'block' : 'none';
    });
  }

  edit(resourceId) {
    this.showResourceFormModal(resourceId);
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