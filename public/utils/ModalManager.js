import { Modal } from '../components/shared/Modal.js';

export class ModalManager {
  constructor() {
    this.activeModal = null;
  }

  show(props) {
    // If a modal is already active, destroy it before showing a new one.
    this.hide();

    const modalProps = {
      id: props.id || `modal-${Date.now()}`,
      title: props.title,
      content: props.content,
      onClose: () => this.hide(), // Hook into modal's close events
    };

    this.activeModal = new Modal(modalProps);
    this.activeModal.mount('body');
    this.activeModal.show();

    if (props.onMount) {
      // Pass the modal's main content element to onMount for listener setup
      props.onMount(this.activeModal.element.querySelector('.modal-content'));
    }
  }

  hide() {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = null;
    }
  }
}