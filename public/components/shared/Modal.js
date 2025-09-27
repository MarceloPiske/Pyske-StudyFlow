export class Modal {
  constructor(props) {
    this.id = props.id;
    this.title = props.title;
    this.content = props.content;
    this.element = null;
  }

  render() {
    return `
      <div id="${this.id}" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h2>${this.title}</h2>
            <button class="btn-close" data-action="close"><span class="material-icons">close</span></button>
          </div>
          <div class="modal-body">
            ${this.content}
          </div>
        </div>
      </div>
    `;
  }

  setupListeners() {
    if (!this.element) return;
    
    const closeBtn = this.element.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Close on backdrop click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });
  }

  mount(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (container) {
      container.insertAdjacentHTML('beforeend', this.render());
      this.element = document.getElementById(this.id);
      this.setupListeners();
    }
  }

  show() {
    if (this.element) {
      this.element.classList.remove('hidden');
    }
  }

  hide() {
    if (this.element) {
      this.element.classList.add('hidden');
    }
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

