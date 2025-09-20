import { 
  collection, 
  addDoc 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class TimerModule {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.currentTopic = null;
    this.interval = null;
  }

  start(topicId, topicName) {
    if (this.isRunning && !this.isPaused) return;

    this.currentTopic = { id: topicId, name: topicName };
    this.isRunning = true;
    this.isPaused = false;

    if (this.pausedTime > 0) {
      // Resume from pause
      this.startTime = Date.now() - this.pausedTime;
    } else {
      // Fresh start
      this.startTime = Date.now();
      this.pausedTime = 0;
    }

    this.showTimerOverlay();
    this.startCounter();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    this.pausedTime = Date.now() - this.startTime;
    this.stopCounter();

    const pauseBtn = document.getElementById('pause-timer');
    pauseBtn.textContent = 'Continuar';
    pauseBtn.onclick = () => this.resume();
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    this.startTime = Date.now() - this.pausedTime;
    this.startCounter();

    const pauseBtn = document.getElementById('pause-timer');
    pauseBtn.textContent = 'Pausar';
    pauseBtn.onclick = () => this.pause();
  }

  async stop() {
    if (!this.isRunning) return;

    const totalTime = this.isPaused ? this.pausedTime : Date.now() - this.startTime;
    const durationInSeconds = Math.floor(totalTime / 1000);
    const notes = document.getElementById('session-notes').value;

    // Save session to Firestore
    await this.saveSession(durationInSeconds, notes);

    // Reset timer
    this.reset();
    this.hideTimerOverlay();
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.currentTopic = null;
    this.stopCounter();
  }

  startCounter() {
    this.interval = setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  stopCounter() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  updateDisplay() {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    
    const display = document.getElementById('timer-time');
    if (display) {
      display.textContent = this.formatTime(seconds);
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  showTimerOverlay() {
    const overlay = document.getElementById('timer-overlay');
    const topicDisplay = document.getElementById('current-topic');
    const notesField = document.getElementById('session-notes');

    topicDisplay.textContent = this.currentTopic.name;
    notesField.value = '';
    overlay.classList.remove('hidden');
  }

  hideTimerOverlay() {
    const overlay = document.getElementById('timer-overlay');
    overlay.classList.add('hidden');
  }

  async saveSession(durationInSeconds, notes) {
    try {
      const user = window.auth.currentUser;
      if (!user) return;

      await addDoc(collection(window.db, 'studySessions'), {
        userId: user.uid,
        topicId: this.currentTopic.id,
        topicName: this.currentTopic.name,
        durationInSeconds,
        notes: notes.trim(),
        createdAt: new Date()
      });

      console.log('Study session saved successfully');
    } catch (error) {
      console.error('Error saving study session:', error);
    }
  }
}