// ─── STORAGE.JS — Backend Supabase (substitui localStorage) ───
const StorageManager = {

  // ── Carrega dados do Supabase ──
  async load() {
    const [{ data: attendants, error: e1 }, { data: contacts, error: e2 }] = await Promise.all([
      db.from('attendants').select('*').order('created_at'),
      db.from('contacts').select('*').order('created_at'),
    ]);
    if (e1) console.error('Erro ao carregar atendentes:', e1);
    if (e2) console.error('Erro ao carregar contatos:', e2);
    AppState.attendants = attendants || [];
    AppState.contacts   = contacts   || [];
  },

  // ── Upsert contato ──
  async upsertContact(contact) {
    const { error } = await db.from('contacts').upsert({
      id:               contact.id,
      nome:             contact.nome     || '',
      telefone:         contact.telefone || '',
      email:            contact.email    || '',
      atendente_id:     contact.atendente_id    || null,
      data_de_marcacao: contact.data_de_marcacao || null,
    });
    if (error) console.error('Erro ao salvar contato:', error);
    return !error;
  },

  // ── Upsert em batch (importação) ──
  async upsertContacts(contacts) {
    const rows = contacts.map(c => ({
      id:               c.id,
      nome:             c.nome     || '',
      telefone:         c.telefone || '',
      email:            c.email    || '',
      atendente_id:     c.atendente_id    || null,
      data_de_marcacao: c.data_de_marcacao || null,
    }));
    const { error } = await db.from('contacts').upsert(rows);
    if (error) console.error('Erro ao importar contatos:', error);
    return !error;
  },

  // ── Upsert atendente ──
  async upsertAttendant(att) {
    const { error } = await db.from('attendants').upsert({
      id:   att.id,
      nome: att.nome,
      cor:  att.cor,
    });
    if (error) console.error('Erro ao salvar atendente:', error);
    return !error;
  },

  // ── Deletar atendente ──
  async deleteAttendant(id) {
    const { error } = await db.from('attendants').delete().eq('id', id);
    if (error) console.error('Erro ao deletar atendente:', error);
    return !error;
  },

  // ── Inscrições Realtime ──
  subscribeRealtime() {
    // Canal para contatos
    db.channel('contacts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, (payload) => {
        StorageManager._handleContactChange(payload);
      })
      .subscribe();

    // Canal para atendentes
    db.channel('attendants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendants' }, (payload) => {
        StorageManager._handleAttendantChange(payload);
      })
      .subscribe();
  },

  _handleContactChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === 'INSERT') {
      // Só adiciona se não existe (evitar eco da própria operação)
      if (!AppState.contacts.find(c => c.id === newRow.id)) {
        AppState.contacts.push(newRow);
        App.refresh();
        UI.toast('📡 Novo contato sincronizado', 'info');
      }
    } else if (eventType === 'UPDATE') {
      const idx = AppState.contacts.findIndex(c => c.id === newRow.id);
      if (idx >= 0) {
        AppState.contacts[idx] = newRow;
        App.refresh();
      }
    } else if (eventType === 'DELETE') {
      const before = AppState.contacts.length;
      AppState.contacts = AppState.contacts.filter(c => c.id !== oldRow.id);
      if (AppState.contacts.length < before) App.refresh();
    }
  },

  _handleAttendantChange(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === 'INSERT') {
      if (!AppState.attendants.find(a => a.id === newRow.id)) {
        AppState.attendants.push(newRow);
        App.refresh();
        UI.toast('📡 Novo atendente sincronizado', 'info');
      }
    } else if (eventType === 'UPDATE') {
      const idx = AppState.attendants.findIndex(a => a.id === newRow.id);
      if (idx >= 0) {
        AppState.attendants[idx] = newRow;
        App.refresh();
      }
    } else if (eventType === 'DELETE') {
      const before = AppState.attendants.length;
      AppState.attendants = AppState.attendants.filter(a => a.id !== oldRow.id);
      // Limpar referências nos contatos
      AppState.contacts.forEach(c => {
        if (c.atendente_id === oldRow.id) c.atendente_id = null;
      });
      if (AppState.attendants.length < before) App.refresh();
    }
  },
};
