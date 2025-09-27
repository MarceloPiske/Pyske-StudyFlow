export class TopicFilters {
  constructor(props) {
    this.onFilterChange = props.onFilterChange;
    this.element = null;
    this.activeFilter = 'all';
  }

  render() {
    return `
      <div class="topics-filters">
        <button class="filter-btn active" data-filter="all">Todos</button>
        <button class="filter-btn" data-filter="status-not-started">Não Iniciados</button>
        <button class="filter-btn" data-filter="status-in-progress">Em Andamento</button>
        <button class="filter-btn" data-filter="status-completed">Concluídos</button>
        <button class="filter-btn" data-filter="priority-high">Alta Prioridade</button>
      </div>
    `;
  }

  setupListeners() {
    if (!this.element) return;

    const filterBtns = this.element.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));

        // Add active class to clicked button
        e.target.classList.add('active');

        // Update active filter
        this.activeFilter = e.target.dataset.filter;

        // Call filter handler
        if (this.onFilterChange) {
          this.onFilterChange(this.activeFilter);
        }
      });
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
}