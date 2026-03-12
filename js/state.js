// ─── STATE.JS — Estado global da aplicação ───
const AppState = {
  contacts: [],       // Array de contatos
  attendants: [],     // Array de atendentes
  filter: {
    search: '',
    attendant: '',
  },
  sort: {
    field: 'nome',
    dir: 'asc',
  },
  pagination: {
    page: 1,
    pageSize: 50,
  },

  // ── Contatos ──
  addContacts(newContacts) {
    let added = 0;
    for (const c of newContacts) {
      const dup = this.contacts.some(
        x => this._normalize(x.telefone) === this._normalize(c.telefone) &&
             this._normalize(x.email)    === this._normalize(c.email) &&
             this._normalize(x.nome)     === this._normalize(c.nome)
      );
      if (!dup) {
        this.contacts.push({ ...c, id: this._uid() });
        added++;
      }
    }
    StorageManager.save();
    return added;
  },

  setContactAttendant(contactId, attendantId) {
    const c = this.contacts.find(x => x.id === contactId);
    if (!c) return;
    c.atendente_id = attendantId || null;
    c.data_de_marcacao = attendantId ? new Date().toISOString() : null;
    StorageManager.save();
  },

  // ── Atendentes ──
  addAttendant(nome, cor) {
    const a = { id: this._uid(), nome: nome.trim(), cor };
    this.attendants.push(a);
    StorageManager.save();
    return a;
  },

  updateAttendant(id, nome, cor) {
    const a = this.attendants.find(x => x.id === id);
    if (!a) return;
    a.nome = nome.trim();
    a.cor  = cor;
    StorageManager.save();
  },

  deleteAttendant(id) {
    this.attendants = this.attendants.filter(x => x.id !== id);
    // Remove referência dos contatos
    this.contacts.forEach(c => {
      if (c.atendente_id === id) {
        c.atendente_id = null;
        c.data_de_marcacao = null;
      }
    });
    StorageManager.save();
  },

  getAttendant(id) {
    return this.attendants.find(x => x.id === id) || null;
  },

  // ── Dados Filtrados ──
  getFiltered() {
    const q = this._normalize(this.filter.search);
    const att = this.filter.attendant;

    return this.contacts.filter(c => {
      const matchSearch = !q || (
        this._normalize(c.nome).includes(q) ||
        this._normalize(c.telefone).includes(q) ||
        this._normalize(c.email).includes(q)
      );
      const matchAtt =
        !att ? true :
        att === 'unassigned' ? !c.atendente_id :
        c.atendente_id === att;
      return matchSearch && matchAtt;
    });
  },

  getSorted(contacts) {
    const { field, dir } = this.sort;
    return [...contacts].sort((a, b) => {
      let va = this._normalize(String(a[field] || ''));
      let vb = this._normalize(String(b[field] || ''));
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1  : -1;
      return 0;
    });
  },

  getPaged(contacts) {
    const { page, pageSize } = this.pagination;
    const start = (page - 1) * pageSize;
    return contacts.slice(start, start + pageSize);
  },

  getStats() {
    const total    = this.contacts.length;
    const called   = this.contacts.filter(c => c.atendente_id).length;
    const uncalled = total - called;
    return { total, called, uncalled };
  },

  // ── Helpers ──
  _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
  _normalize(s = '') {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  },
};
