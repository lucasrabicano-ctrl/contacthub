// ─── ATTENDANTS.JS — CRUD de atendentes (async com Supabase) ───
const AttendantsManager = {
  _editingId: null,

  render() {
    const grid = document.getElementById('attendants-grid');
    if (AppState.attendants.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:60px 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.2" stroke="currentColor" style="width:56px;height:56px;margin:0 auto 20px;opacity:.3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
          </svg>
          <h3>Nenhum atendente cadastrado</h3>
          <p>Clique em <strong>Novo Atendente</strong> para adicionar</p>
        </div>`;
      return;
    }

    grid.innerHTML = AppState.attendants.map(a => {
      const count    = AppState.contacts.filter(c => c.atendente_id === a.id).length;
      const initials = a.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return `
        <div class="attendant-card" id="acard-${a.id}">
          <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${a.cor};border-radius:12px 0 0 12px;"></div>
          <div class="attendant-avatar" style="background:${a.cor};box-shadow:0 4px 15px ${this._hexToRgba(a.cor,0.4)}">${initials}</div>
          <div class="attendant-info">
            <div class="attendant-name">${this._esc(a.nome)}</div>
            <div class="attendant-count">${count} contato(s) ligado(s)</div>
          </div>
          <div class="attendant-actions">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="AttendantsManager.openModal('${a.id}')" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="15" height="15">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
              </svg>
            </button>
            <button class="btn btn-danger btn-icon btn-sm" onclick="AttendantsManager.confirmDelete('${a.id}')" title="Deletar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="15" height="15">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
              </svg>
            </button>
          </div>
        </div>`;
    }).join('');
  },

  openModal(id = null) {
    this._editingId = id;
    const att = id ? AppState.getAttendant(id) : null;
    const defaultColor = this._randomColor();
    UI.openModal(`
      <div class="modal-title">${att ? 'Editar Atendente' : 'Novo Atendente'}</div>
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input type="text" class="form-input" id="att-nome" placeholder="Nome do atendente"
          value="${att ? this._esc(att.nome) : ''}" autofocus/>
      </div>
      <div class="form-group">
        <label class="form-label">Cor</label>
        <div class="color-row">
          <div class="color-preview" id="color-preview" style="background:${att ? att.cor : defaultColor}"
               onclick="document.getElementById('att-cor-picker').click()"></div>
          <input type="color" id="att-cor-picker" value="${att ? att.cor : defaultColor}"
                 oninput="document.getElementById('color-preview').style.background=this.value"/>
          <input type="text" class="form-input" id="att-cor-text" value="${att ? att.cor : defaultColor}"
                 placeholder="#7c3aed" maxlength="7"
                 oninput="AttendantsManager._syncColorText(this.value)"/>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="att-save-btn" onclick="AttendantsManager.save()">
          ${att ? 'Salvar' : 'Criar Atendente'}
        </button>
      </div>
    `);
    setTimeout(() => {
      document.getElementById('att-nome').addEventListener('keydown', e => {
        if (e.key === 'Enter') AttendantsManager.save();
      });
    }, 50);
  },

  _syncColorText(val) {
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      document.getElementById('att-cor-picker').value = val;
      document.getElementById('color-preview').style.background = val;
    }
  },

  async save() {
    const nome = document.getElementById('att-nome').value.trim();
    const cor  = document.getElementById('att-cor-picker').value;
    if (!nome) {
      document.getElementById('att-nome').style.borderColor = 'var(--danger)';
      document.getElementById('att-nome').focus();
      return;
    }

    const btn = document.getElementById('att-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    if (this._editingId) {
      await AppState.updateAttendant(this._editingId, nome, cor);
      UI.toast('Atendente atualizado!', 'success');
    } else {
      await AppState.addAttendant(nome, cor);
      UI.toast('Atendente criado!', 'success');
    }

    UI.closeModal();
    App.refresh();
  },

  confirmDelete(id) {
    const att   = AppState.getAttendant(id);
    if (!att) return;
    const count = AppState.contacts.filter(c => c.atendente_id === id).length;
    UI.openModal(`
      <div class="modal-title">Deletar Atendente</div>
      <p style="color:var(--text-2);font-size:14px;line-height:1.6;margin-bottom:8px">
        Tem certeza que deseja deletar <strong style="color:var(--text-1)">${this._esc(att.nome)}</strong>?
      </p>
      ${count > 0 ? `<p style="color:var(--warning);font-size:13px">⚠ ${count} contato(s) perderão a marcação deste atendente.</p>` : ''}
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-danger" id="del-btn" onclick="AttendantsManager.doDelete('${id}')">Deletar</button>
      </div>
    `);
  },

  async doDelete(id) {
    const btn = document.getElementById('del-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Deletando...'; }
    await AppState.deleteAttendant(id);
    UI.toast('Atendente removido.', 'info');
    UI.closeModal();
    App.refresh();
  },

  _randomColor() {
    const colors = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#6366f1'];
    return colors[Math.floor(Math.random() * colors.length)];
  },
  _esc(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
  _hexToRgba(hex, alpha) {
    try {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    } catch { return `rgba(0,0,0,${alpha})`; }
  },
};
