export class BadgeRenderer {
  static renderStatusBadge(status) {
    const badges = {
      'Não Iniciado': { icon: '<span class="material-icons small">radio_button_unchecked</span>', class: 'status-not-started' },
      'Em Andamento': { icon: '<span class="material-icons small">pending</span>', class: 'status-in-progress' },
      'Concluído': { icon: '<span class="material-icons small">check_circle</span>', class: 'status-completed' }
    };
    const badge = badges[status] || badges['Não Iniciado'];
    return `<span class="topic-badge ${badge.class}" title="Status: ${status}">${badge.icon}</span>`;
  }

  static renderPriorityBadge(priority) {
    const badges = {
      'Alta': { icon: '<span class="material-icons small">local_fire_department</span>', class: 'priority-high' },
      'Média': { icon: '<span class="material-icons small">remove</span>', class: 'priority-medium' },
      'Baixa': { icon: '<span class="material-icons small">ac_unit</span>', class: 'priority-low' }
    };
    const badge = badges[priority] || badges['Média'];
    return `<span class="topic-badge ${badge.class}" title="Prioridade: ${priority}">${badge.icon}</span>`;
  }

  static renderProficiencyBadge(proficiency) {
    if (!proficiency) return '';
    return `<span class="topic-proficiency ${proficiency?.toLowerCase()}">${proficiency}</span>`;
  }

  static renderDueDateBadge(dueDate) {
    if (!dueDate) return '';

    const date = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let badge = '';
    if (diffDays < 0) {
      badge = `<span class="topic-badge due-overdue" title="Atrasado"><span class="material-icons small">warning</span> ${Math.abs(diffDays)}d</span>`;
    } else if (diffDays <= 3) {
      badge = `<span class="topic-badge due-urgent" title="Urgente"><span class="material-icons small">alarm</span> ${diffDays}d</span>`;
    } else if (diffDays <= 7) {
      badge = `<span class="topic-badge due-soon" title="Em breve"><span class="material-icons small">schedule</span> ${diffDays}d</span>`;
    }

    return badge;
  }

  static renderNoteTypeBadge(type) {
    const badges = {
      'internal_note': '<span class="material-icons small">edit_note</span> Nota',
      'google_doc': '<span class="material-icons small">description</span> Google Docs',
      'drive_link': '<span class="material-icons small">cloud</span> Drive',
      'external_link': '<span class="material-icons small">link</span> Link'
    };
    return badges[type] || '<span class="material-icons small">edit_note</span>';
  }
}