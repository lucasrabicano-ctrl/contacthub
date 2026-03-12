// ─── STATE.JS — Estado global (operações async com Supabase) ───
const AppState = {
  contacts:   [],
  attendants: [],
  filter: { search: '', attendant: '' },
  sort:   { field: 'nome', dir: 'asc' },
  pagination: { page: 1, pageSize: 50 },

  // ── Contatos ──
  async addContacts(newContacts) {
    // Deduplicar: filtrar os que não existem localmente
    const toAdd = newContacts.filter(c => !this.contacts.some(
      x => this._normalize(x.telefone) === this._normalize(c.telefone) &&
           this._normalize(x.email)    === this._normalize(c.email) &&
           this._normalize(x.nome)     === this._normalize(c.nome)
    )).map(c => ({ ...c, id: this._uid() }));

    if (toAdd.length === 0) return 0;

    // Salvar no Supabase (o realtime vai sincronizar nos outros clientes)
    await StorageManager.upsertContacts(toAdd);

    // Atualizar memória local
    this.contacts.push(...toAdd);
    return toAdd.length;
  },

  async setContactAttendant(contactId, attendantId) {
    const c = this.contacts.find(x => x.id === contactId);
    if (!c) return;
    c.atendente_id     = attendantId || null;
    c.data_de_marcacao = attendantId ? new Date().toISOString() : null;
    await StorageManager.upsertContact(c);
  },

  // ── Atendentes ──
  async addAttendant(nome, cor) {
    const a = { id: this._uid(), nome: nome.trim(), cor };
    this.attendants.push(a);
    await StorageManager.upsertAttendant(a);
    return a;
  },

  async updateAttendant(id, nome, cor) {
    const a = this.attendants.find(x => x.id === id);
    if (!a) return;
    a.nome = nome.trim();
    a.cor  = cor;
    await StorageManager.upsertAttendant(a);
  },

  async deleteAttendant(id) {
    this.attendants = this.attendants.filter(x => x.id !== id);
    this.contacts.forEach(c => {
      if (c.atendente_id === id) {
        c.atendente_id     = null;
        c.data_de_marcacao = null;
      }
    });
    await StorageManager.deleteAttendant(id);
  },

  getAttendant(id) {
    return this.attendants.find(x => x.id === id) || null;
  },

  // ── Filtros / Ordenação / Paginação ──
  getFiltered() {
    const q   = this._normalize(this.filter.search);
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
      const va = this._normalize(String(a[field] || ''));
      const vb = this._normalize(String(b[field] || ''));
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
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
    return { total, called, uncalled: total - called };
  },

  _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
  _normalize(s = '') {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  },
};
