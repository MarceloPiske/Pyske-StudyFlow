import { TopicItem } from './TopicItem.js';

export class TopicList {
  constructor(props) {
    this.topics = props.topics || [];
    this.onEdit = props.onEdit;
    this.onDelete = props.onDelete;
    this.onStudy = props.onStudy;
    this.onNavigate = props.onNavigate;
    this.onDragDrop = props.onDragDrop;
    this.element = null;
    this.draggedTopic = null;
  }

  buildTopicTree() {
    const rootTopics = this.topics.filter(topic => !topic.parentId);
    return this.createTopicItems(rootTopics);
  }

  createTopicItems(topics, level = 0) {
    return topics.map(topic => {
      const children = this.topics.filter(t => t.parentId === topic.id);
      const childItems = children.length > 0 ? this.createTopicItems(children, level + 1) : [];
      
      return new TopicItem({
        topic,
        level,
        children: childItems,
        onEdit: this.onEdit,
        onDelete: this.onDelete,
        onStudy: this.onStudy,
        onNavigate: this.onNavigate
      });
    });
  }

  render() {
    const topicItems = this.buildTopicTree();
    
    if (topicItems.length === 0) {
      return '<p class="empty-state">Nenhum tópico criado ainda.</p>';
    }

    return `
      <ul class="tree-list">
        ${topicItems.map(item => item.render()).join('')}
      </ul>
    `;
  }

  setupListeners() {
    if (!this.element) return;

    // Setup listeners for all topic items recursively
    this.setupTopicItemListeners(this.element);

    // Setup drag and drop if handler provided
    if (this.onDragDrop) {
      this.setupDragAndDrop();
    }
  }

  setupTopicItemListeners(container) {
    // Setup listeners for all topic items in the container
    const topicItems = container.querySelectorAll('.topic-item');
    
    topicItems.forEach(itemElement => {
      const topicId = itemElement.dataset.topicId;
      
      // Clear existing listeners by cloning element
      const newElement = itemElement.cloneNode(true);
      itemElement.parentNode.replaceChild(newElement, itemElement);
      
      // Add new listeners
      const editBtn = newElement.querySelector('.btn-edit');
      const deleteBtn = newElement.querySelector('.btn-delete');
      const studyBtn = newElement.querySelector('.btn-study');
      const topicName = newElement.querySelector('.topic-name');

      if (editBtn && this.onEdit) {
        editBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.onEdit(topicId);
        });
      }

      if (deleteBtn && this.onDelete) {
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.onDelete(topicId);
        });
      }

      if (studyBtn && this.onStudy) {
        studyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const topicName = e.target.closest('[data-topic-name]')?.dataset.topicName || 'Unknown';
          this.onStudy(topicId, topicName);
        });
      }

      if (topicName && this.onNavigate) {
        topicName.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.onNavigate(topicId);
        });
      }
    });
  }

  setupDragAndDrop() {
    this.element.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-topic')) {
        this.draggedTopic = e.target.dataset.topicId;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    this.element.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('draggable-topic')) {
        e.target.classList.remove('dragging');
        this.draggedTopic = null;
      }
    });

    this.element.addEventListener('dragover', (e) => {
      const dropTarget = e.target.closest('.topic-item');
      if (dropTarget && !dropTarget.classList.contains('dragging')) {
        e.preventDefault();
        dropTarget.classList.add('drag-over');
      }
    });

    this.element.addEventListener('dragleave', (e) => {
      const dropTarget = e.target.closest('.topic-item');
      if (dropTarget) {
        dropTarget.classList.remove('drag-over');
      }
    });

    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropTarget = e.target.closest('.topic-item');
      
      if (dropTarget && this.draggedTopic) {
        dropTarget.classList.remove('drag-over');
        const newParentId = dropTarget.dataset.topicId;
        
        if (this.draggedTopic !== newParentId && this.onDragDrop) {
          this.onDragDrop(this.draggedTopic, newParentId);
        }
      }
    });
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
    if (this.element) {
      const container = this.element.parentElement || this.element;
      container.innerHTML = this.render();
      this.element = container.querySelector('.tree-list') || container;
      this.setupListeners();
    }
  }
}