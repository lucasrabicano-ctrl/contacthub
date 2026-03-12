// ─── CONTACTS-VIEW.JS — Tabela de contatos (assignAttendant async) ───
const ContactsView = {

  render() {
    this._updateStats();
    this._updateLegend();
    this._updateFilterSelect();

    const filtered = AppState.getFiltered();
    const sorted   = AppState.getSorted(filtered);
    const total    = sorted.length;
    const paged    = AppState.getPaged(sorted);

    this._renderTable(paged);
    this._renderPagination(total);
    this._updateExportStats();
  },

  _renderTable(contacts) {
    const tbody = document.getElementById('contacts-tbody');
    const empty = document.getElementById('empty-state');
    const table = document.getElementById('contacts-table');
    const pag   = document.getElementById('pagination');

    if (AppState.contacts.length === 0) {
      empty.style.display = 'block';
      table.style.display = 'none';
      pag.style.display   = 'none';
      return;
    }
    empty.style.display = 'none';
    table.style.display = 'table';

    if (contacts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-3)">Nenhum contato encontrado.</td></tr>`;
      pag.style.display = 'none';
      return;
    }

    tbody.innerHTML = contacts.map(c => {
      const att     = c.atendente_id ? AppState.getAttendant(c.atendente_id) : null;
      const color   = att ? att.cor : null;
      const rowBg   = color ? `background:${this._hexToRgba(color, 0.07)};` : '';
      const dateFmt = c.data_de_marcacao
        ? new Date(c.data_de_marcacao).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
        : '—';
      const attOptions = AppState.attendants.map(a =>
        `<option value="${a.id}" ${c.atendente_id === a.id ? 'selected' : ''}>${a.nome}</option>`
      ).join('');

      return `
        <tr style="${rowBg}" id="row-${c.id}">
          <td style="position:relative;padding-left:${color ? '20px' : '16px'}">
            ${color ? `<span class="attendant-color-bar" style="background:${color}"></span>` : ''}
            ${this._esc(c.nome) || '<span style="color:var(--text-3)">—</span>'}
          </td>
          <td>${this._esc(c.telefone) || '<span style="color:var(--text-3)">—</span>'}</td>
          <td>${this._esc(c.email) || '<span style="color:var(--text-3)">—</span>'}</td>
          <td>
            <select class="attendant-select" onchange="ContactsView.assignAttendant('${c.id}', this.value)">
              <option value="">— Selecionar —</option>
              ${attOptions}
            </select>
          </td>
          <td style="font-size:12px;color:var(--text-3)">${dateFmt}</td>
        </tr>`;
    }).join('');
  },

  _renderPagination(total) {
    const pag  = document.getElementById('pagination');
    const info = document.getElementById('pagination-info');
    const ctrl = document.getElementById('pagination-controls');

    if (total === 0) { pag.style.display = 'none'; return; }
    pag.style.display = 'flex';

    const { page, pageSize } = AppState.pagination;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize + 1;
    const end   = Math.min(page * pageSize, total);
    info.textContent = `${start}–${end} de ${total} contatos`;

    let pages = `<button class="page-btn" ${page===1?'disabled':''} onclick="ContactsView.goToPage(${page-1})">‹</button>`;
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, page-delta); i <= Math.min(totalPages-1, page+delta); i++) range.push(i);

    if (totalPages > 1) {
      pages += `<button class="page-btn ${page===1?'active':''}" onclick="ContactsView.goToPage(1)">1</button>`;
      if (range[0] > 2) pages += `<button class="page-btn" disabled>…</button>`;
    }
    range.forEach(p => { pages += `<button class="page-btn ${p===page?'active':''}" onclick="ContactsView.goToPage(${p})">${p}</button>`; });
    if (totalPages > 1) {
      if (range[range.length-1] < totalPages-1) pages += `<button class="page-btn" disabled>…</button>`;
      pages += `<button class="page-btn ${page===totalPages?'active':''}" onclick="ContactsView.goToPage(${totalPages})">${totalPages}</button>`;
    }
    pages += `<button class="page-btn" ${page>=totalPages?'disabled':''} onclick="ContactsView.goToPage(${page+1})">›</button>`;
    ctrl.innerHTML = pages;
  },

  _updateStats() {
    const s = AppState.getStats();
    document.getElementById('stat-total').textContent      = s.total;
    document.getElementById('stat-called').textContent     = s.called;
    document.getElementById('stat-uncalled').textContent   = s.uncalled;
    document.getElementById('stat-attendants').textContent = AppState.attendants.length;
  },

  _updateExportStats() {
    const s = AppState.getStats();
    const pct = s.total > 0 ? Math.round(s.called / s.total * 100) : 0;
    document.getElementById('exp-total').textContent   = s.total;
    document.getElementById('exp-called').textContent  = s.called;
    document.getElementById('exp-uncalled').textContent = s.uncalled;
    document.getElementById('exp-pct').textContent     = pct + '%';
  },

  _updateLegend() {
    const wrap = document.getElementById('legend-wrap');
    if (AppState.attendants.length === 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    wrap.innerHTML = AppState.attendants.map(a => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${a.cor}"></span>
        <span>${this._esc(a.nome)}</span>
      </div>`).join('') + `
      <div class="legend-item">
        <span class="legend-dot" style="background:var(--border-strong)"></span>
        <span style="color:var(--text-3)">Sem atendente</span>
      </div>`;
  },

  _updateFilterSelect() {
    const sel = document.getElementById('filter-attendant');
    const cur = sel.value;
    sel.innerHTML = `
      <option value="">Todos os atendentes</option>
      <option value="unassigned">Sem atendente</option>
      ${AppState.attendants.map(a => `<option value="${a.id}" ${cur===a.id?'selected':''}>${this._esc(a.nome)}</option>`).join('')}`;
    sel.value = cur;
  },

  async assignAttendant(contactId, attendantId) {
    await AppState.setContactAttendant(contactId, attendantId || null);
    this.render();
  },

  onSearch() {
    AppState.filter.search = document.getElementById('search-input').value;
    AppState.pagination.page = 1;
    this.render();
  },

  onFilterAttendant() {
    AppState.filter.attendant = document.getElementById('filter-attendant').value;
    AppState.pagination.page = 1;
    this.render();
  },

  onPageSizeChange() {
    AppState.pagination.pageSize = parseInt(document.getElementById('page-size-select').value);
    AppState.pagination.page = 1;
    this.render();
  },

  sort(field) {
    if (AppState.sort.field === field) AppState.sort.dir = AppState.sort.dir === 'asc' ? 'desc' : 'asc';
    else { AppState.sort.field = field; AppState.sort.dir = 'asc'; }
    this.render();
  },

  goToPage(p) {
    AppState.pagination.page = p;
    this.render();
    document.getElementById('contacts-tbody')?.closest('.table-wrap')?.scrollIntoView({ behavior:'smooth', block:'start' });
  },

  _esc(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
  _hexToRgba(hex, alpha) {
    try {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    } catch { return `rgba(0,0,0,${alpha})`; }
  },
};
