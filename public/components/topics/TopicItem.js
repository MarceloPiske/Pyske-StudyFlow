import { BadgeRenderer } from '../shared/badge-renderer.js';

export class TopicItem {
  constructor(props) {
    this.topic = props.topic;
    this.level = props.level || 0;
    this.children = props.children || [];
    this.onEdit = props.onEdit;
    this.onDelete = props.onDelete;
    this.onStudy = props.onStudy;
    this.onNavigate = props.onNavigate;
    this.element = null;
  }

  render() {
    return `
      <li class="tree-item">
        <div class="topic-item draggable-topic" 
             data-topic-id="${this.topic.id}" 
             data-topic-name="${this.topic.name}"
             draggable="true">
          <div class="topic-content">
            <span class="topic-name" data-topic-id="${this.topic.id}">${this.topic.name}</span>
            <div class="topic-badges">
              ${BadgeRenderer.renderStatusBadge(this.topic.status)}
              ${BadgeRenderer.renderPriorityBadge(this.topic.priority)}
              ${BadgeRenderer.renderProficiencyBadge(this.topic.proficiency)}
              ${BadgeRenderer.renderDueDateBadge(this.topic.dueDate)}
            </div>
          </div>
          <div class="topic-actions">
            <button class="btn-edit" data-topic-id="${this.topic.id}" title="Editar">
              <span class="material-icons small">edit</span>
            </button>
            <button class="btn-delete" data-topic-id="${this.topic.id}" title="Excluir">
              <span class="material-icons small">delete</span>
            </button>
            <button class="btn-study" data-topic-id="${this.topic.id}" data-topic-name="${this.topic.name}" title="Estudar">
              <span class="material-icons small">school</span>
            </button>
          </div>
        </div>
        ${this.children.length > 0 ? `
          <ul class="tree-list" style="margin-left: ${(this.level + 1) * 20}px;">
            ${this.children.map(child => child.render()).join('')}
          </ul>
        ` : ''}
      </li>
    `;
  }

  setupListeners() {
    if (!this.element) return;

    const editBtn = this.element.querySelector('.btn-edit');
    const deleteBtn = this.element.querySelector('.btn-delete');
    const studyBtn = this.element.querySelector('.btn-study');
    const topicName = this.element.querySelector('.topic-name');

    if (editBtn && this.onEdit) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onEdit(this.topic.id);
      });
    }

    if (deleteBtn && this.onDelete) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onDelete(this.topic.id);
      });
    }

    if (studyBtn && this.onStudy) {
      studyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onStudy(this.topic.id, this.topic.name);
      });
    }

    if (topicName && this.onNavigate) {
      topicName.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onNavigate(this.topic.id);
      });
    }

    // Setup listeners for children
    this.children.forEach(child => child.setupListeners());
  }

  mount(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (container) {
      container.insertAdjacentHTML('beforeend', this.render());
      this.element = container.lastElementChild;
      this.setupListeners();
    }
  }
}