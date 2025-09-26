export class UIUtils {
  static showModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
  }

  static hideModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  }

  static clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
      // Clear any hidden fields
      const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
      hiddenInputs.forEach(input => input.value = '');
    }
  }

  static updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
  }

  static updateElementHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = html;
  }

  static showLoadingState(containerId, message = 'Carregando...') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>${message}</p>
        </div>
      `;
    }
  }
}

