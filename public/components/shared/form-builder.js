export class FormBuilder {
  static renderSelectOptions(items, valueField = 'id', textField = 'name', placeholder = 'Selecione uma opção') {
    const options = [`<option value="">${placeholder}</option>`];
    items.forEach(item => {
      options.push(`<option value="${item[valueField]}">${item[textField]}</option>`);
    });
    return options.join('');
  }

  static renderTopicTree(topics, selectedIds = [], level = 0) {
    const rootTopics = topics.filter(topic => !topic.parentId);
    return this.buildTreeCheckboxes(rootTopics, topics, selectedIds, level);
  }

  static buildTreeCheckboxes(topicList, allTopics, selectedIds, level = 0) {
    if (!topicList.length) return '';

    return topicList.map(topic => {
      const isSelected = selectedIds.includes(topic.id);
      const children = allTopics.filter(t => t.parentId === topic.id);

      return `
        <label class="topic-checkbox" style="margin-left: ${level * 20}px;">
          <input type="checkbox" value="${topic.id}" ${isSelected ? 'checked' : ''}>
          <span>${topic.name}</span>
        </label>
        ${this.buildTreeCheckboxes(children, allTopics, selectedIds, level + 1)}
      `;
    }).join('');
  }

  static getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
    const checkedValues = Array.from(checkboxes).map(cb => cb.value);
    if (checkedValues.length > 0) {
      data.selectedTopics = checkedValues;
    }

    return data;
  }

  static populateForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form) return;

    Object.keys(data).forEach(key => {
      const field = form.querySelector(`[name="${key}"], #${key}`);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = data[key];
        } else {
          field.value = data[key] || '';
        }
      }
    });
  }
}