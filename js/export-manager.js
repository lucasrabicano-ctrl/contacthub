// ─── EXPORT-MANAGER.JS — Exportação CSV e PDF com gráficos ───
const ExportManager = {

  // ── Exportar CSV ──
  exportCSV() {
    const contacts = AppState.contacts;
    if (contacts.length === 0) {
      UI.toast('Nenhum contato para exportar.', 'error');
      return;
    }

    const header = ['Nome', 'Telefone', 'Email', 'Atendente', 'Data de Marcação'];
    const rows = contacts.map(c => {
      const att = c.atendente_id ? AppState.getAttendant(c.atendente_id) : null;
      const date = c.data_de_marcacao
        ? new Date(c.data_de_marcacao).toLocaleString('pt-BR')
        : '';
      return [
        this._csvField(c.nome),
        this._csvField(c.telefone),
        this._csvField(c.email),
        this._csvField(att ? att.nome : ''),
        this._csvField(date),
      ].join(',');
    });

    const csv = [header.join(','), ...rows].join('\r\n');
    const bom = '\uFEFF'; // UTF-8 BOM para Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    this._download(blob, `contacthub_${this._dateStr()}.csv`);
    UI.toast(`CSV exportado com ${contacts.length} contatos!`, 'success');
  },

  // ── Exportar PDF ──
  async exportPDF() {
    if (AppState.contacts.length === 0) {
      UI.toast('Nenhum contato para exportar.', 'error');
      return;
    }

    UI.showLoading('Gerando PDF com gráficos...');

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      // ── Cabeçalho ──
      doc.setFillColor(10, 10, 20);
      doc.rect(0, 0, W, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('ContactHub', margin, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Relatório de Contatos', margin, 26);

      doc.setTextColor(160, 160, 192);
      doc.setFontSize(9);
      const now = new Date().toLocaleString('pt-BR');
      doc.text(`Gerado em: ${now}`, W - margin, 26, { align: 'right' });

      y = 50;

      // ── Estatísticas ──
      const stats = AppState.getStats();
      const pct = stats.total > 0 ? Math.round(stats.called / stats.total * 100) : 0;

      const statBoxes = [
        { label: 'Total',       value: stats.total,    color: [124, 58, 237] },
        { label: 'Ligados',     value: stats.called,   color: [16, 185, 129] },
        { label: 'Não Ligados', value: stats.uncalled, color: [245, 158, 11] },
        { label: '% Ligado',    value: pct + '%',      color: [6, 182, 212]  },
      ];

      const boxW = (W - margin * 2 - 9) / 4;
      statBoxes.forEach((s, i) => {
        const x = margin + i * (boxW + 3);
        doc.setFillColor(...s.color);
        doc.roundedRect(x, y, boxW, 18, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(String(s.value), x + boxW / 2, y + 10, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(s.label, x + boxW / 2, y + 15, { align: 'center' });
      });

      y += 26;

      // ── Gráficos (via canvas Chart.js) ──
      const chartsImgs = await this._renderCharts();

      if (chartsImgs.pie) {
        const chartY = y;
        doc.setTextColor(30, 30, 50);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Contatos por Atendente', margin, y);
        y += 5;
        const cw = (W - margin * 2 - 10) / 2;
        doc.addImage(chartsImgs.pie,  'PNG', margin,        y, cw, cw * 0.7);
        if (chartsImgs.bar) {
          doc.addImage(chartsImgs.bar, 'PNG', margin + cw + 10, y, cw, cw * 0.7);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100,100,120);
          doc.text('Status Geral', margin + cw + 10 + cw/2, chartY, { align: 'center' });
        }
        y += cw * 0.7 + 8;
      }

      // ── Tabela de Contatos ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 50);
      doc.text('Tabela de Contatos', margin, y);
      y += 4;

      const tableData = AppState.contacts.map(c => {
        const att = c.atendente_id ? AppState.getAttendant(c.atendente_id) : null;
        const date = c.data_de_marcacao
          ? new Date(c.data_de_marcacao).toLocaleDateString('pt-BR')
          : '—';
        return [c.nome || '—', c.telefone || '—', c.email || '—', att ? att.nome : '—', date];
      });

      // Cores das linhas baseadas nos atendentes
      const rowStyles = AppState.contacts.map(c => {
        const att = c.atendente_id ? AppState.getAttendant(c.atendente_id) : null;
        if (!att) return {};
        const r = parseInt(att.cor.slice(1,3),16);
        const g = parseInt(att.cor.slice(3,5),16);
        const b = parseInt(att.cor.slice(5,7),16);
        return { fillColor: [r, g, b], textColor: [255,255,255] };
      });

      doc.autoTable({
        startY: y,
        head: [['Nome', 'Telefone', 'Email', 'Atendente', 'Data']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [10, 10, 20], textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rs = rowStyles[data.row.index];
            if (rs.fillColor) {
              data.cell.styles.fillColor = rs.fillColor;
              data.cell.styles.textColor = rs.textColor;
            }
          }
        },
        margin: { left: margin, right: margin },
        tableWidth: W - margin * 2,
      });

      // ── Rodapé ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(10, 10, 20);
        doc.rect(0, H - 10, W, 10, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 192);
        doc.text(`ContactHub  •  Total: ${stats.total} contatos  •  Ligados: ${stats.called}  •  Página ${i} de ${pageCount}`, W / 2, H - 3.5, { align: 'center' });
      }

      doc.save(`contacthub_relatorio_${this._dateStr()}.pdf`);
      UI.toast('PDF exportado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      UI.toast('Erro ao gerar PDF: ' + err.message, 'error');
    } finally {
      UI.hideLoading();
    }
  },

  // ── Renderizar gráficos em canvas ──
  async _renderCharts() {
    const imgs = {};
    const attendants = AppState.attendants;

    // Gráfico de pizza (por atendente)
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 280;
      document.body.appendChild(canvas);

      const uncalled = AppState.contacts.filter(c => !c.atendente_id).length;
      const labels = [...attendants.map(a => a.nome), 'Sem Atendente'];
      const data   = [...attendants.map(a => AppState.contacts.filter(c => c.atendente_id === a.id).length), uncalled];
      const colors = [...attendants.map(a => a.cor), '#3a3a5a'];

      const chart = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#0f0f1a' }] },
        options: {
          responsive: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#333', font: { size: 11 }, padding: 12 } },
          },
        },
      });

      await new Promise(r => setTimeout(r, 300));
      imgs.pie = canvas.toDataURL('image/png');
      chart.destroy();
      document.body.removeChild(canvas);
    } catch(e) { console.warn('Pie chart error:', e); }

    // Gráfico de barras (ligados vs não ligados)
    try {
      const canvas2 = document.createElement('canvas');
      canvas2.width = 400; canvas2.height = 280;
      document.body.appendChild(canvas2);

      const called   = AppState.contacts.filter(c => c.atendente_id).length;
      const uncalled = AppState.contacts.length - called;

      const chart2 = new Chart(canvas2, {
        type: 'bar',
        data: {
          labels: ['Ligados', 'Não Ligados'],
          datasets: [{
            data: [called, uncalled],
            backgroundColor: ['#10b981', '#f59e0b'],
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: '#555' }, grid: { color: '#eee' } },
            x: { ticks: { color: '#555' }, grid: { display: false } },
          },
        },
      });

      await new Promise(r => setTimeout(r, 300));
      imgs.bar = canvas2.toDataURL('image/png');
      chart2.destroy();
      document.body.removeChild(canvas2);
    } catch(e) { console.warn('Bar chart error:', e); }

    return imgs;
  },

  _csvField(val) {
    const s = String(val || '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  },

  _dateStr() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  },

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
