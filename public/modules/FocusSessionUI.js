export class FocusSessionUI {
  constructor(resourcesManager) {
    this.resourcesManager = resourcesManager;
  }

  render(topic) {
    this.topic = topic;
    return `
      <div class="focus-session-container">
        <div class="study-preparation">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Preparação para o Estudo</h3>
            </div>
            <div class="card-body">
              <div class="quick-actions-grid">
                <div class="quick-action-card" onclick="window.app.navigateToSection('books')">
                  <span class="material-icons quick-action-icon">library_books</span>
                  <div class="quick-action-title">Adicionar Livro</div>
                  <div class="quick-action-desc">Cadastre livros relacionados ao tópico</div>
                </div>
                <div class="quick-action-card" onclick="document.getElementById('add-resource-btn')?.click()">
                  <span class="material-icons quick-action-icon">article</span>
                  <div class="quick-action-title">Adicionar Artigo</div>
                  <div class="quick-action-desc">Salve artigos e materiais de apoio</div>
                </div>
                <div class="quick-action-card" onclick="document.getElementById('youtube-link')?.focus()">
                  <span class="material-icons quick-action-icon">smart_display</span>
                  <div class="quick-action-title">Adicionar Vídeo</div>
                  <div class="quick-action-desc">Configure vídeos para assistir</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Configuração do Ambiente</h3>
            </div>
            <div class="card-body">
              <div class="focus-tools">
                <div class="form-group">
                  <label class="form-label">Música de Estudo</label>
                  <div class="youtube-input-group">
                    <input type="text" id="youtube-link" class="form-input" placeholder="Link do YouTube">
                    <button type="button" id="load-video" class="btn btn-secondary">Carregar</button>
                  </div>
                </div>

                <div class="video-container" id="video-container" style="display: none;">
                  <iframe id="youtube-iframe" width="100%" height="200" frameborder="0"></iframe>
                </div>

                <div class="music-presets">
                  <p class="form-label">Sugestões:</p>
                  <div class="preset-buttons">
                    <button class="btn-preset" data-video="jfKfPfyJRdk">Lofi Hip Hop</button>
                    <button class="btn-preset" data-video="5qap5aO4i9A">Chuva</button>
                    <button class="btn-preset" data-video="4xDzrJKXOOY">Piano</button>
                    <button class="btn-preset" data-video="hHW1oY26kxQ">Natureza</button>
                  </div>
                </div>

                <div class="timer-settings">
                  <div class="form-group">
                    <label class="form-label">Duração da Sessão (minutos)</label>
                    <select id="session-duration" class="form-input">
                      <option value="25">25 min (Pomodoro)</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Rascunho da Sessão</h3>
            </div>
            <div class="card-body">
              <textarea id="session-scratchpad" class="form-input" rows="8" placeholder="Use este espaço para anotações rápidas durante o estudo..."></textarea>
              <div class="form-actions">
                <button id="save-scratchpad" class="btn btn-secondary btn-sm">
                  <span class="material-icons">save</span> Salvar Rascunho
                </button>
                <button id="convert-to-resource" class="btn btn-primary btn-sm">
                  <span class="material-icons">note_add</span> Converter em Recurso
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="session-actions">
          <button class="study-action-btn" data-topic-id="${topic.id}" data-topic-name="${topic.name}">
            <span class="material-icons">play_arrow</span> Iniciar Sessão de Estudo
          </button>
        </div>
      </div>
    `;
  }

  setupListeners() {
    // YouTube video loading
    document.getElementById('load-video')?.addEventListener('click', () => {
      const url = document.getElementById('youtube-link').value;
      this.loadYouTubeVideo(url);
    });

    // Preset buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const videoId = e.target.dataset.video;
        this.loadPresetVideo(videoId);
      });
    });

    // Scratchpad actions
    document.getElementById('save-scratchpad')?.addEventListener('click', () => {
      this.saveScratchpad();
    });

    document.getElementById('convert-to-resource')?.addEventListener('click', () => {
      this.convertScratchpadToResource();
    });

    // Study button
    document.querySelectorAll('.study-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const topicId = e.currentTarget.dataset.topicId;
        const topicName = e.currentTarget.dataset.topicName;
        window.app.startStudySession(topicId, topicName);
      });
    });
  }

  extractVideoId(url) {
    const regExp = "/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/";
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  loadYouTubeVideo(url) {
    if (!url) return;
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      alert('URL do YouTube inválida. Tente novamente.');
      return;
    }

    const iframe = document.getElementById('youtube-iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${videoId}`;
    document.getElementById('video-container').style.display = 'block';
  }

  loadPresetVideo(videoId) {
    this.loadYouTubeVideo(`https://www.youtube.com/watch?v=${videoId}`);
  }

  saveScratchpad() {
    const scratchpad = document.getElementById('session-scratchpad');
    const content = scratchpad.value;
    if (!content) {
      alert('Escreva algo no rascunho antes de salvar.');
      return;
    }

    // Save to localStorage
    localStorage.setItem(`scratchpad-${this.topic.id}`, content);
    alert('Rascunho salvo localmente!');
  }

  convertScratchpadToResource() {
    const scratchpad = document.getElementById('session-scratchpad');
    const content = scratchpad.value.trim();
    if (!content) {
      alert('Escreva algo no rascunho antes de converter.');
      return;
    }

    this.resourcesManager.showModal({
        title: `Rascunho de Sessão - ${new Date().toLocaleDateString()}`,
        type: 'internal_note',
        content: content,
        source: 'Sessão de Estudo'
    });
  }
}