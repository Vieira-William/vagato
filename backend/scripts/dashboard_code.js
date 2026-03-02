// ========================================
// Dashboard 1:1 - Cole no Console do Figma
// ========================================
// Abra: Figma Desktop → Plugins → Dev Tools (Console)
// Cole este código inteiro e pressione Enter

(async () => {
  console.log("🚀 Criando Dashboard 1:1...");
  
  // Criar Board (artboard)
  const board = figma.createBoard();
  board.name = "Dashboard - Dark Mode (1:1)";
  board.resize(1440, 900);
  
  // Cores dark mode
  const colors = {
    bg_primary: { r: 0.0588, g: 0.0588, b: 0.0706 },      // #0f0f12
    bg_secondary: { r: 0.1, g: 0.1, b: 0.12 },            // #1a1a1f
    text_primary: { r: 1, g: 1, b: 1 },                   // #ffffff
    text_secondary: { r: 0.628, g: 0.628, b: 0.665 },     // #a1a1aa
    accent_primary: { r: 0.39, g: 0.4, b: 0.98 },         // #6366f1 (Indigo)
    accent_success: { r: 0.34, g: 0.78, b: 0.35 }         // #22c55e (Green)
  };
  
  // === SIDEBAR (224px × 900) ===
  const sidebar = figma.createFrame();
  sidebar.name = "Sidebar";
  sidebar.resize(224, 900);
  sidebar.x = 0;
  sidebar.y = 0;
  sidebar.fills = [{ type: 'SOLID', color: colors.bg_primary }];
  sidebar.layoutMode = "VERTICAL";
  sidebar.itemSpacing = 0;
  sidebar.paddingLeft = 16;
  sidebar.paddingRight = 16;
  sidebar.paddingTop = 24;
  sidebar.paddingBottom = 24;
  
  // Logo
  const logo = figma.createText();
  logo.characters = "Vagas UX";
  logo.fontSize = 18;
  logo.fontWeight = 600;
  logo.fills = [{ type: 'SOLID', color: colors.text_primary }];
  sidebar.appendChild(logo);
  
  // Nav Items
  ["Dashboard", "Meu Perfil", "Match", "Configurações"].forEach((item, idx) => {
    const nav = figma.createText();
    nav.characters = item;
    nav.fontSize = 14;
    nav.fills = [{ type: 'SOLID', color: idx === 0 ? colors.accent_primary : colors.text_secondary }];
    sidebar.appendChild(nav);
  });
  
  board.appendChild(sidebar);
  
  // === MAIN CONTENT (1216px × 900) ===
  const main = figma.createFrame();
  main.name = "Main";
  main.resize(1216, 900);
  main.x = 224;
  main.fills = [{ type: 'SOLID', color: colors.bg_primary }];
  main.layoutMode = "VERTICAL";
  main.itemSpacing = 0;
  
  // === HEADER STATS (5 cards) ===
  const statsRow = figma.createFrame();
  statsRow.name = "Stats";
  statsRow.resize(1216, 60);
  statsRow.fills = [{ type: 'SOLID', color: colors.bg_primary }];
  statsRow.layoutMode = "HORIZONTAL";
  statsRow.itemSpacing = 16;
  statsRow.paddingLeft = 20;
  statsRow.paddingRight = 20;
  statsRow.paddingTop = 12;
  statsRow.paddingBottom = 12;
  
  const stats = [
    {label: "Total", value: "114"},
    {label: "Pendentes", value: "89"},
    {label: "Aplicadas", value: "3"},
    {label: "24h", value: "12"},
    {label: "Destaques", value: "8"}
  ];
  
  stats.forEach(stat => {
    const card = figma.createFrame();
    card.name = stat.label;
    card.resize(220, 36);
    card.fills = [{ type: 'SOLID', color: colors.bg_secondary, opacity: 0.5 }];
    card.cornerRadius = 8;
    card.layoutMode = "HORIZONTAL";
    card.itemSpacing = 12;
    card.paddingLeft = 12;
    card.paddingRight = 12;
    
    const lbl = figma.createText();
    lbl.characters = stat.label;
    lbl.fontSize = 12;
    lbl.fills = [{ type: 'SOLID', color: colors.text_secondary }];
    card.appendChild(lbl);
    
    const val = figma.createText();
    val.characters = stat.value;
    val.fontSize = 20;
    val.fontWeight = 700;
    val.fills = [{ type: 'SOLID', color: colors.accent_primary }];
    card.appendChild(val);
    
    statsRow.appendChild(card);
  });
  
  main.appendChild(statsRow);
  
  // === TOOLBAR ===
  const toolbar = figma.createFrame();
  toolbar.name = "Toolbar";
  toolbar.resize(1216, 48);
  toolbar.fills = [{ type: 'SOLID', color: colors.bg_primary }];
  toolbar.layoutMode = "HORIZONTAL";
  toolbar.itemSpacing = 12;
  toolbar.paddingLeft = 20;
  toolbar.paddingRight = 20;
  toolbar.paddingTop = 12;
  toolbar.paddingBottom = 12;
  
  ["Todo período", "Buscar...", "Compatibilidade"].forEach(text => {
    const btn = figma.createFrame();
    btn.resize(140, 24);
    btn.fills = [{ type: 'SOLID', color: colors.bg_secondary }];
    btn.cornerRadius = 6;
    const t = figma.createText();
    t.characters = text;
    t.fontSize = 12;
    t.fills = [{ type: 'SOLID', color: colors.text_primary }];
    btn.appendChild(t);
    toolbar.appendChild(btn);
  });
  
  main.appendChild(toolbar);
  
  // === TABS ===
  const tabs = figma.createFrame();
  tabs.name = "Tabs";
  tabs.resize(1216, 40);
  tabs.fills = [{ type: 'SOLID', color: colors.bg_primary }];
  tabs.layoutMode = "HORIZONTAL";
  tabs.itemSpacing = 2;
  tabs.paddingLeft = 20;
  tabs.paddingRight = 20;
  tabs.paddingTop = 8;
  tabs.paddingBottom = 8;
  
  ["Todas 114", "Favoritos 0", "Destaques 0", "Indeed 36", "LinkedIn 34", "Posts 44"].forEach((tab, idx) => {
    const tabBtn = figma.createFrame();
    tabBtn.resize(120, 24);
    tabBtn.fills = [{ type: 'SOLID', color: colors.bg_secondary, opacity: idx === 0 ? 1 : 0.5 }];
    tabBtn.cornerRadius = 4;
    const tabText = figma.createText();
    tabText.characters = tab;
    tabText.fontSize = 12;
    tabText.fills = [{ type: 'SOLID', color: colors.text_primary }];
    tabBtn.appendChild(tabText);
    tabs.appendChild(tabBtn);
  });
  
  main.appendChild(tabs);
  
  // === CONTENT (Filters + Cards) ===
  const content = figma.createFrame();
  content.name = "Content";
  content.resize(1216, 752);
  content.fills = [{ type: 'SOLID', color: colors.bg_primary }];
  content.layoutMode = "HORIZONTAL";
  content.itemSpacing = 16;
  content.paddingLeft = 20;
  content.paddingRight = 20;
  content.paddingTop = 16;
  content.paddingBottom = 16;
  
  // Filters
  const filters = figma.createFrame();
  filters.name = "Filters";
  filters.resize(200, 720);
  filters.fills = [{ type: 'SOLID', color: colors.bg_secondary }];
  filters.cornerRadius = 8;
  filters.layoutMode = "VERTICAL";
  filters.itemSpacing = 16;
  filters.paddingLeft = 12;
  filters.paddingRight = 12;
  filters.paddingTop = 12;
  filters.paddingBottom = 12;
  
  ["Fonte", "Status", "Modalidade", "Inglês"].forEach(label => {
    const group = figma.createFrame();
    group.name = label;
    group.resize(176, 40);
    group.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
    group.layoutMode = "VERTICAL";
    group.itemSpacing = 6;
    
    const lbl = figma.createText();
    lbl.characters = label;
    lbl.fontSize = 12;
    lbl.fontWeight = 600;
    lbl.fills = [{ type: 'SOLID', color: colors.text_primary }];
    group.appendChild(lbl);
    
    const dropdown = figma.createFrame();
    dropdown.resize(176, 24);
    dropdown.fills = [{ type: 'SOLID', color: colors.bg_primary }];
    dropdown.cornerRadius = 4;
    const dropText = figma.createText();
    dropText.characters = "Todos";
    dropText.fontSize = 12;
    dropText.fills = [{ type: 'SOLID', color: colors.text_primary }];
    dropdown.appendChild(dropText);
    group.appendChild(dropdown);
    
    filters.appendChild(group);
  });
  
  content.appendChild(filters);
  
  // === CARDS GRID (6 cards: 3×2) ===
  const cardsGrid = figma.createFrame();
  cardsGrid.name = "Cards";
  cardsGrid.resize(980, 720);
  cardsGrid.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
  cardsGrid.layoutMode = "VERTICAL";
  cardsGrid.itemSpacing = 16;
  
  const cardData = [
    {title: "Product Designer Sênior", score: 92, source: "LinkedIn"},
    {title: "UX Designer Pleno", score: 85, source: "Indeed"},
    {title: "UX Lead", score: 78, source: "Posts"},
    {title: "Product Designer — Mobile", score: 74, source: "LinkedIn"},
    {title: "UX/UI Designer — B2B", score: 71, source: "Indeed"},
    {title: "Senior UX Designer", score: 68, source: "Posts"}
  ];
  
  for (let i = 0; i < 2; i++) {
    const row = figma.createFrame();
    row.name = `Row ${i+1}`;
    row.resize(980, 340);
    row.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 16;
    
    for (let j = 0; j < 3; j++) {
      const idx = i * 3 + j;
      const data = cardData[idx];
      
      const vagaCard = figma.createFrame();
      vagaCard.name = `Card: ${data.title}`;
      vagaCard.resize(312, 340);
      vagaCard.fills = [{ type: 'SOLID', color: colors.bg_secondary }];
      vagaCard.cornerRadius = 8;
      vagaCard.layoutMode = "VERTICAL";
      vagaCard.itemSpacing = 12;
      vagaCard.paddingLeft = 16;
      vagaCard.paddingRight = 16;
      vagaCard.paddingTop = 16;
      vagaCard.paddingBottom = 16;
      
      // Header
      const header = figma.createFrame();
      header.resize(280, 24);
      header.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
      header.layoutMode = "HORIZONTAL";
      header.itemSpacing = 8;
      
      const source = figma.createText();
      source.characters = data.source;
      source.fontSize = 11;
      source.fills = [{ type: 'SOLID', color: colors.text_secondary }];
      header.appendChild(source);
      
      const score = figma.createText();
      score.characters = `${data.score}%`;
      score.fontSize = 12;
      score.fontWeight = 700;
      score.fills = [{ type: 'SOLID', color: colors.accent_success }];
      header.appendChild(score);
      
      vagaCard.appendChild(header);
      
      // Title
      const title = figma.createText();
      title.characters = data.title;
      title.fontSize = 14;
      title.fontWeight = 600;
      title.fills = [{ type: 'SOLID', color: colors.text_primary }];
      vagaCard.appendChild(title);
      
      // Company
      const company = figma.createText();
      company.characters = "Empresa Confidencial";
      company.fontSize = 12;
      company.fills = [{ type: 'SOLID', color: colors.text_secondary }];
      vagaCard.appendChild(company);
      
      // Tags
      const tagsFrame = figma.createFrame();
      tagsFrame.resize(280, 24);
      tagsFrame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
      tagsFrame.layoutMode = "HORIZONTAL";
      tagsFrame.itemSpacing = 6;
      
      ["Figma", "Notion"].forEach(tag => {
        const tagEl = figma.createFrame();
        tagEl.resize(50, 20);
        tagEl.fills = [{ type: 'SOLID', color: colors.bg_primary }];
        tagEl.cornerRadius = 4;
        const tagText = figma.createText();
        tagText.characters = tag;
        tagText.fontSize = 10;
        tagText.fills = [{ type: 'SOLID', color: colors.text_secondary }];
        tagEl.appendChild(tagText);
        tagsFrame.appendChild(tagEl);
      });
      vagaCard.appendChild(tagsFrame);
      
      // Actions
      const actions = figma.createFrame();
      actions.resize(280, 32);
      actions.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
      actions.layoutMode = "HORIZONTAL";
      actions.itemSpacing = 8;
      
      ["Pendente", "✨", "Aplicar"].forEach(btn => {
        const btnEl = figma.createFrame();
        btnEl.resize(85, 28);
        btnEl.fills = [{ type: 'SOLID', color: colors.bg_primary }];
        btnEl.cornerRadius = 6;
        const btnText = figma.createText();
        btnText.characters = btn;
        btnText.fontSize = 11;
        btnText.fills = [{ type: 'SOLID', color: colors.text_primary }];
        btnEl.appendChild(btnText);
        actions.appendChild(btnEl);
      });
      vagaCard.appendChild(actions);
      
      row.appendChild(vagaCard);
    }
    
    cardsGrid.appendChild(row);
  }
  
  content.appendChild(cardsGrid);
  main.appendChild(content);
  
  board.appendChild(main);
  figma.currentPage.appendChild(board);
  
  console.log("✅ Dashboard 1:1 criado com sucesso!");
})();
