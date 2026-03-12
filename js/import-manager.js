// ─── IMPORT-MANAGER.JS — Leitura e mapeamento inteligente de arquivos ───
const ImportManager = {

  triggerImport() {
    document.getElementById('file-input').value = '';
    document.getElementById('file-input').click();
  },

  async handleFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;
    await this.processFile(file);
  },

  async processFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    UI.showLoading(`Lendo arquivo ${file.name}...`);
    try {
      let rows = [];
      if (ext === 'csv')                  rows = await this._readCSV(file);
      else if (ext === 'xlsx' || ext === 'xls') rows = await this._readXLSX(file);
      else if (ext === 'pdf')             rows = await this._readPDF(file);
      else {
        UI.toast('Formato não suportado. Use CSV, XLSX ou PDF.', 'error');
        return;
      }

      if (!rows || rows.length === 0) {
        UI.toast('Nenhum dado encontrado no arquivo.', 'error');
        return;
      }

      const contacts = this._mapColumns(rows);
      if (contacts.length === 0) {
        UI.toast('Não foi possível identificar colunas de Nome, Telefone ou Email.', 'error');
        return;
      }

      const added = AppState.addContacts(contacts);
      UI.toast(`✓ ${added} contato(s) importado(s) com sucesso! (${contacts.length - added} duplicatas ignoradas)`, 'success');
      App.refresh();
    } catch (err) {
      console.error(err);
      UI.toast('Erro ao processar o arquivo: ' + err.message, 'error');
    } finally {
      UI.hideLoading();
    }
  },

  // ── Leitura CSV via SheetJS ──
  _readCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'binary', raw: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(data);
        } catch(err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });
  },

  // ── Leitura XLSX via SheetJS ──
  _readXLSX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(data);
        } catch(err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  // ── Leitura PDF via PDF.js ──
  async _readPDF(file) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let allLines = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      // Agrupar por linha (Y position)
      const byY = {};
      for (const item of content.items) {
        const y = Math.round(item.transform[5]);
        if (!byY[y]) byY[y] = [];
        byY[y].push(item.str);
      }
      const sortedYs = Object.keys(byY).map(Number).sort((a,b) => b - a);
      for (const y of sortedYs) {
        allLines.push(byY[y].join(' ').trim());
      }
    }

    return this._parsePDFLines(allLines.filter(l => l.length > 0));
  },

  // ── Parser de linhas PDF → array de objetos ──
  _parsePDFLines(lines) {
    const rows = [];
    // Tentar detectar se a primeira linha é cabeçalho
    const firstLineIsHeader = lines.length > 1 && this._looksLikeHeader(lines[0]);

    if (firstLineIsHeader) {
      const headers = lines[0].split(/[,;\t|]+/).map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(/[,;\t|]+/).map(v => v.trim());
        if (vals.length < 2) continue;
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
        rows.push(obj);
      }
    } else {
      // Tentar formato: linha contém email/telefone
      for (const line of lines) {
        const emailMatch = line.match(/[\w._%+-]+@[\w.-]+\.[a-z]{2,}/i);
        const phoneMatch = line.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[\s.-]?\d{4}/);
        if (emailMatch || phoneMatch) {
          const parts = line.split(/[,;\t|]+/).map(p => p.trim());
          // Heurística: primeira parte não sendo tel/email = nome
          const obj = { _raw: line };
          if (emailMatch) obj.Email = emailMatch[0];
          if (phoneMatch) obj.Telefone = phoneMatch[0];
          // Nome é o que resta
          const rest = line
            .replace(emailMatch ? emailMatch[0] : '', '')
            .replace(phoneMatch ? phoneMatch[0] : '', '')
            .replace(/[,;|]+/g, ' ').trim();
          if (rest) obj.Nome = rest;
          rows.push(obj);
        }
      }
    }
    return rows;
  },

  _looksLikeHeader(line) {
    const normalized = line.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return /nome|name|email|telefone|phone|tel|contact/.test(normalized);
  },

  // ── Mapeamento inteligente de colunas ──
  _mapColumns(rows) {
    if (!rows || rows.length === 0) return [];
    const sampleKeys = Object.keys(rows[0]);

    const findKey = (patterns) => {
      for (const k of sampleKeys) {
        const kn = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (patterns.some(p => kn.includes(p))) return k;
      }
      return null;
    };

    const nomeKey  = findKey(['nome', 'name', 'contato', 'client', 'pessoa', 'razao', 'empresa', 'company']);
    const telKey   = findKey(['telefone', 'phone', 'tel', 'celular', 'fone', 'mobile', 'whatsapp', 'cel', 'numero', 'number']);
    const emailKey = findKey(['email', 'e-mail', 'e_mail', 'mail', 'correio']);

    return rows
      .map(row => ({
        nome:     (nomeKey  ? String(row[nomeKey]  || '') : '').trim(),
        telefone: (telKey   ? String(row[telKey]   || '') : '').trim(),
        email:    (emailKey ? String(row[emailKey] || '') : '').trim(),
        atendente_id:     null,
        data_de_marcacao: null,
      }))
      .filter(c => c.nome || c.telefone || c.email);
  },
};

// ── Drag and Drop na janela toda ──
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  document.getElementById('drop-overlay').classList.add('active');
});
document.getElementById('drop-overlay').addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) {
    document.getElementById('drop-overlay').classList.remove('active');
  }
});
document.getElementById('drop-overlay').addEventListener('dragover', (e) => { e.preventDefault(); });
document.getElementById('drop-overlay').addEventListener('drop', async (e) => {
  e.preventDefault();
  document.getElementById('drop-overlay').classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (file) await ImportManager.processFile(file);
});
