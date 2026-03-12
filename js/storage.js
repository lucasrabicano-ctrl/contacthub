// ─── STORAGE.JS — Persistência via localStorage ───
const StorageManager = {
  KEY_CONTACTS:   'contacthub_contacts',
  KEY_ATTENDANTS: 'contacthub_attendants',

  save() {
    try {
      localStorage.setItem(this.KEY_CONTACTS,   JSON.stringify(AppState.contacts));
      localStorage.setItem(this.KEY_ATTENDANTS, JSON.stringify(AppState.attendants));
    } catch(e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  },

  load() {
    try {
      const contacts   = localStorage.getItem(this.KEY_CONTACTS);
      const attendants = localStorage.getItem(this.KEY_ATTENDANTS);
      if (contacts)   AppState.contacts   = JSON.parse(contacts);
      if (attendants) AppState.attendants = JSON.parse(attendants);
    } catch(e) {
      console.warn('Erro ao carregar do localStorage:', e);
    }
  },
};
