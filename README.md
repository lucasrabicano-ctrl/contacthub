# 📇 ContactHub — Gestão de Contatos

App web completo para importar planilhas, visualizar contatos e gerenciar atendentes com sistema de cores.

> Abre direto no navegador — sem servidor, sem instalação.

---

## ✨ Funcionalidades

- **Importar** arquivos CSV, XLSX e PDF
- **Mapeamento inteligente** de colunas (Nome, Telefone, Email)
- **Drag-and-drop** de arquivos
- **Tabela** com busca, filtro, ordenação e paginação
- **Atendentes** com CRUD completo e color picker
- **Cores na tabela** — cada linha muda de cor pelo atendente que ligou
- **Exportar CSV** compatível com Excel
- **Exportar PDF** com gráficos (pizza + barras) e tabela estilizada
- **localStorage** — dados persistem entre sessões
- **Responsivo** para desktop e mobile

---

## 🚀 Como usar

1. Baixe ou clone o repositório
2. Abra `index.html` no seu navegador (Chrome, Edge ou Firefox)
3. Pronto!

```bash
git clone https://github.com/SEU_USUARIO/contacthub.git
cd contacthub
# Abra index.html no navegador
```

---

## 📁 Estrutura

```
contacthub/
├── index.html          # App principal (HTML + CSS)
└── js/
    ├── state.js         # Estado global
    ├── storage.js       # Persistência localStorage
    ├── import-manager.js # Leitura CSV/XLSX/PDF
    ├── contacts-view.js  # Tabela de contatos
    ├── attendants.js     # CRUD de atendentes
    ├── export-manager.js # Exportação CSV e PDF
    └── app.js            # Orquestrador + UI helpers
```

---

## 🛠️ Tecnologias

| Lib | Uso |
|-----|-----|
| [SheetJS](https://sheetjs.com/) | Leitura de CSV e XLSX |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Extração de texto de PDFs |
| [Chart.js](https://chartjs.org/) | Gráficos no relatório PDF |
| [jsPDF](https://github.com/parallax/jsPDF) | Geração do PDF |
| Google Fonts (Syne + DM Sans) | Tipografia |

---

## 📸 Screenshots

> Dark mode profissional com sidebar, tabela colorida e modal de atendentes.

---

## 📄 Licença

MIT
