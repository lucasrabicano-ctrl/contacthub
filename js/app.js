// ─── APP.JS — Orquestrador principal (init async + Supabase realtime + UI) ───

// ── UI helpers ──
const UI = {
  showLoading(text = 'Processando...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.add('active');
  },
  hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
  },
  toast(message, type = 'info') {
    const icons = {
      success: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="#10b981"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      error:   `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="#ef4444"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>`,
      info:    `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="#06b6d4"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>`,
    };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = (icons[type] || '') + `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    }, 4500);
  },
  openModal(html) {
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modal').onclick = (e) => {
      if (e.target === document.getElementById('modal')) UI.closeModal();
    };
    document.addEventListener('keydown', UI._escHandler);
  },
  closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.removeEventListener('keydown', UI._escHandler);
  },
  _escHandler(e) { if (e.key === 'Escape') UI.closeModal(); },
};

// ── Indicador de conexão realtime ──
const RealtimeStatus = {
  _el: null,
  init() {
    const topbar = document.querySelector('.topbar-actions');
    const dot = document.createElement('div');
    dot.id = 'realtime-dot';
    dot.title = 'Conectando ao realtime...';
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:#f59e0b;transition:background 0.4s;flex-shrink:0;`;
    topbar.prepend(dot);
    this._el = dot;
  },
  setConnected() {
    if (!this._el) return;
    this._el.style.background = '#10b981';
    this._el.title = '🟢 Realtime conectado — sincronizando em tempo real';
  },
  setDisconnected() {
    if (!this._el) return;
    this._el.style.background = '#ef4444';
    this._el.title = '🔴 Realtime desconectado';
  },
};

// ── App ──
const App = {
  _currentSection: 'contacts',
  _sidebarCollapsed: false,

  async init() {
    RealtimeStatus.init();

    // Mostrar loading enquanto carrega do Supabase
    UI.showLoading('Carregando dados do servidor...');
    try {
      await StorageManager.load();
    } catch (e) {
      UI.toast('Erro ao conectar ao banco de dados. Verifique a conexão.', 'error');
      console.error(e);
    }
    UI.hideLoading();

    // Iniciar realtime
    try {
      StorageManager.subscribeRealtime();
      // Verificar status da conexão após 2s
      setTimeout(() => {
        const channels = db.getChannels();
        const allSubscribed = channels.every(c => c.state === 'joined');
        if (allSubscribed) RealtimeStatus.setConnected();
        else RealtimeStatus.setDisconnected();
      }, 2000);
    } catch (e) {
      console.warn('Realtime não disponível:', e);
      RealtimeStatus.setDisconnected();
    }

    this.refresh();

    // Restaurar preferência de sidebar
    const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (collapsed) this.toggleSidebar();
  },

  navigate(section) {
    this._currentSection = section;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');
    const titles = { contacts: 'Contatos', attendants: 'Atendentes', export: 'Exportar' };
    document.getElementById('topbar-title').textContent = titles[section] || section;
    document.getElementById('sidebar').classList.remove('mobile-open');
  },

  refresh() {
    ContactsView.render();
    AttendantsManager.render();
  },

  toggleSidebar() {
    this._sidebarCollapsed = !this._sidebarCollapsed;
    document.getElementById('sidebar').classList.toggle('collapsed', this._sidebarCollapsed);
    localStorage.setItem('sidebar_collapsed', this._sidebarCollapsed);
  },

  toggleMobileSidebar() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
  },
};

// ── Inicializar ──
document.addEventListener('DOMContentLoaded', () => App.init());
