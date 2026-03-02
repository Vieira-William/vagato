#!/usr/bin/env python3
"""
Injeta Dashboard 1:1 no Figma via Bridge WebSocket
Basado na screenshot real da aplicação
"""

import asyncio
import websockets
import json
import sys

FIGMA_BRIDGE_URL = "ws://localhost:9999"

# Cores e tokens do design system (dark mode)
COLORS = {
    "bg_primary": "#0f0f12",
    "bg_secondary": "#1a1a1f",
    "bg_tertiary": "#252529",
    "border": "#2e2e33",
    "text_primary": "#ffffff",
    "text_secondary": "#a1a1aa",
    "text_muted": "#71717a",
    "accent_primary": "#6366f1",  # Indigo
    "accent_success": "#22c55e",   # Green
    "accent_warning": "#f59e0b",   # Amber
}

DASHBOARD_CODE = """
// Dashboard 1:1 - Dark Mode
(async () => {
  // Criar artboard 1440x900
  const artboard = figma.createBoard();
  artboard.name = "Dashboard - Dark Mode (1:1)";
  artboard.resize(1440, 900);
  artboard.fills = [{type: 'SOLID', color: {r: 0.0588, g: 0.0588, b: 0.0706}}];
  
  // SIDEBAR (224px x 900)
  const sidebar = figma.createFrame();
  sidebar.name = "Sidebar";
  sidebar.resize(224, 900);
  sidebar.x = 0;
  sidebar.y = 0;
  sidebar.fills = [{type: 'SOLID', color: {r: 0.0588, g: 0.0588, b: 0.0706}}];
  sidebar.layoutMode = "VERTICAL";
  sidebar.itemSpacing = 0;
  sidebar.paddingLeft = 16;
  sidebar.paddingRight = 16;
  sidebar.paddingTop = 24;
  sidebar.paddingBottom = 24;
  
  // Logo + Brand
  const logo = figma.createText();
  logo.characters = "Vagas UX";
  logo.fontSize = 18;
  logo.fontWeight = 600;
  logo.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
  sidebar.appendChild(logo);
  
  // Nav Items
  const navItems = ["Dashboard", "Meu Perfil", "Match", "Configurações"];
  navItems.forEach((item, idx) => {
    const navItem = figma.createText();
    navItem.characters = item;
    navItem.fontSize = 14;
    navItem.fills = [{type: 'SOLID', color: idx === 0 ? {r: 0.39, g: 0.4, b: 0.98} : {r: 0.628, g: 0.628, b: 0.665}}];
    navItem.lineHeight = {value: 20, unit: "PIXELS"};
    sidebar.appendChild(navItem);
  });
  
  artboard.appendChild(sidebar);
  
  // MAIN CONTENT (1216px x 900)
  const main = figma.createFrame();
  main.name = "Main Content";
  main.resize(1216, 900);
  main.x = 224;
  main.y = 0;
  main.fills = [{type: 'SOLID', color: {r: 0.0588, g: 0.0588, b: 0.0706}}];
  main.layoutMode = "VERTICAL";
  main.itemSpacing = 0;
  
  // HEADER - Stats Row (5 cards)
  const headerStats = figma.createFrame();
  headerStats.name = "Stats Row";
  headerStats.resize(1216, 60);
  headerStats.fills = [{type: 'SOLID', color: {r: 0.0588, g: 0.0588, b: 0.0706}}];
  headerStats.layoutMode = "HORIZONTAL";
  headerStats.itemSpacing = 16;
  headerStats.paddingLeft = 20;
  headerStats.paddingRight = 20;
  headerStats.paddingTop = 12;
  headerStats.paddingBottom = 12;
  
  const stats = [
    {label: "Total", value: "114"},
    {label: "Pendentes", value: "89"},
    {label: "Aplicadas", value: "3"},
    {label: "24h", value: "12"},
    {label: "Destaques", value: "8"}
  ];
  
  stats.forEach(stat => {
    const statCard = figma.createFrame();
    statCard.name = `Stat: ${stat.label}`;
    statCard.resize(220, 36);
    statCard.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.12}, opacity: 0.5}];
    statCard.cornerRadius = 8;
    statCard.layoutMode = "HORIZONTAL";
    statCard.itemSpacing = 12;
    statCard.paddingLeft = 12;
    statCard.paddingRight = 12;
    statCard.paddingTop = 8;
    statCard.paddingBottom = 8;
    
    const labelText = figma.createText();
    labelText.characters = stat.label;
    labelText.fontSize = 12;
    labelText.fills = [{type: 'SOLID', color: {r: 0.628, g: 0.628, b: 0.665}}];
    statCard.appendChild(labelText);
    
    const valueText = figma.createText();
    valueText.characters = stat.value;
    valueText.fontSize = 20;
    valueText.fontWeight = 700;
    valueText.fills = [{type: 'SOLID', color: {r: 0.39, g: 0.4, b: 0.98}}];
    statCard.appendChild(valueText);
    
    headerStats.appendChild(statCard);
  });
  
  main.appendChild(headerStats);
  
  // TOOLBAR - Período, Busca, Ordenação
  const toolbar = figma.createFrame();
  toolbar.name = "Toolbar";
  toolbar.resize(1216, 48);
  toolbar.fills = [{type: 'SOLID', color: {r: 0.0588, g: 0.0588, b: 0.0706}}];
  toolbar.layoutMode = "HORIZONTAL";
  toolbar.itemSpacing = 12;
  toolbar.paddingLeft = 20;
  toolbar.paddingRight = 20;
  toolbar.paddingTop = 12;
  toolbar.paddingBottom = 12;
  
  // Período selector
  const period = figma.createFrame();
  period.name = "Period";
  period.resize(140, 24);
  period.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.12}}];
  period.cornerRadius = 6;
  const periodText = figma.createText();
  periodText.characters = "Todo período";
  periodText.fontSize = 12;
  periodText.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
  period.appendChild(periodText);
  toolbar.appendChild(period);
  
  // Search box
  const search = figma.createFrame();
  search.name = "Search";
  search.resize(200, 24);
  search.fills = [{type: 'SOLID', color: {r: 0.15, g: 0.15, b: 0.18}}];
  search.cornerRadius = 6;
  const searchText = figma.createText();
  searchText.characters = "Buscar...";
  searchText.fontSize = 12;
  searchText.fills = [{type: 'SOLID', color: {r: 0.628, g: 0.628, b: 0.665}}];
  search.appendChild(searchText);
  toolbar.appendChild(search);
  
  // Sort
  const sort = figma.createFrame();
  sort.name = "Sort";
  sort.resize(140, 24);
  sort.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.12}}];
  sort.cornerRadius = 6;
  const sortText = figma.createText();
  sortText.characters = "Compatibilidade";
  sortText.fontSize = 12;
  sortText.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
  sort.appendChild(sortText);
  toolbar.appendChild(sort);
  
  main.appendChild(toolbar);
  
  // TABS - Todas/Favoritos/Destaques/Indeed/LinkedIn/Posts
  const tabsFrame = figma.createFrame();
  tabsFrame.name = "Tabs";
  tabsFrame.resize(1216, 40);
  tabsFrame.fills = [{type: 'SOLID', color: {r: 0.0588, g: 0.0588, b: 0.0706}}];
  tabsFrame.layoutMode = "HORIZONTAL";
  tabsFrame.itemSpacing = 2;
  tabsFrame.paddingLeft = 20;
  tabsFrame.paddingRight = 20;
  tabsFrame.paddingTop = 8;
  tabsFrame.paddingBottom = 8;
  
  const tabs = ["Todas 114", "Favoritos 0", "Destaques 0", "Indeed 36", "LinkedIn 34", "Posts 44"];
  tabs.forEach((tab, idx) => {
    const tabBtn = figma.createFrame();
    tabBtn.name = `Tab: ${tab}`;
    tabBtn.resize(120, 24);
    tabBtn.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.12}, opacity: idx === 0 ? 1 : 0.5}];
    tabBtn.cornerRadius = 4;
    const tabText = figma.createText();
    tabText.characters = tab;
    tabText.fontSize = 12;
    tabText.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
    tabBtn.appendChild(tabText);
    tabsFrame.appendChild(tabBtn);
  });
  
  main.appendChild(tabsFrame);
  
  // CONTENT AREA - Filtros + Cards Grid
  const content = figma.createFrame();
  content.name = "Content";
  content.resize(1216, 752);
  content.fills = [{type: 'SOLID', color: {r: 0.0588, g: 0.0588, b: 0.0706}}];
  content.layoutMode = "HORIZONTAL";
  content.itemSpacing = 16;
  content.paddingLeft = 20;
  content.paddingRight = 20;
  content.paddingTop = 16;
  content.paddingBottom = 16;
  
  // FILTERS SIDEBAR (200px)
  const filtersSidebar = figma.createFrame();
  filtersSidebar.name = "Filters";
  filtersSidebar.resize(200, 720);
  filtersSidebar.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.12}}];
  filtersSidebar.cornerRadius = 8;
  filtersSidebar.layoutMode = "VERTICAL";
  filtersSidebar.itemSpacing = 16;
  filtersSidebar.paddingLeft = 12;
  filtersSidebar.paddingRight = 12;
  filtersSidebar.paddingTop = 12;
  filtersSidebar.paddingBottom = 12;
  
  const filterLabels = ["Fonte", "Status", "Modalidade", "Inglês"];
  filterLabels.forEach(label => {
    const filterGroup = figma.createFrame();
    filterGroup.name = `Filter: ${label}`;
    filterGroup.resize(176, 40);
    filterGroup.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}, opacity: 0}];
    filterGroup.layoutMode = "VERTICAL";
    filterGroup.itemSpacing = 6;
    
    const labelText = figma.createText();
    labelText.characters = label;
    labelText.fontSize = 12;
    labelText.fontWeight = 600;
    labelText.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
    filterGroup.appendChild(labelText);
    
    const dropdown = figma.createFrame();
    dropdown.name = "Dropdown";
    dropdown.resize(176, 24);
    dropdown.fills = [{type: 'SOLID', color: {r: 0.15, g: 0.15, b: 0.18}}];
    dropdown.cornerRadius = 4;
    const dropdownText = figma.createText();
    dropdownText.characters = "Todos";
    dropdownText.fontSize = 12;
    dropdownText.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
    dropdown.appendChild(dropdownText);
    filterGroup.appendChild(dropdown);
    
    filtersSidebar.appendChild(filterGroup);
  });
  
  content.appendChild(filtersSidebar);
  
  // CARDS GRID (3 columns x 2 rows = 6 VagaCards)
  const cardsGrid = figma.createFrame();
  cardsGrid.name = "Cards Grid";
  cardsGrid.resize(980, 720);
  cardsGrid.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}, opacity: 0}];
  cardsGrid.layoutMode = "VERTICAL";
  cardsGrid.itemSpacing = 16;
  
  // Grid de cards (2 rows, 3 cols)
  const cardTitles = [
    {title: "Product Designer Sênior — Design System", score: 92, source: "LinkedIn"},
    {title: "UX Designer Pleno — Growth & Experimentation", score: 85, source: "Indeed"},
    {title: "UX Lead — Seller Experience & Onboarding", score: 78, source: "Posts"},
    {title: "Product Designer — Mobile & Consumer Apps", score: 74, source: "LinkedIn"},
    {title: "UX/UI Designer — Plataforma B2B SaaS", score: 71, source: "Indeed"},
    {title: "Senior UX Designer — Fintech Products", score: 68, source: "Posts"}
  ];
  
  for (let i = 0; i < 2; i++) {
    const row = figma.createFrame();
    row.name = `Row ${i+1}`;
    row.resize(980, 340);
    row.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}, opacity: 0}];
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 16;
    
    for (let j = 0; j < 3; j++) {
      const cardIdx = i * 3 + j;
      const card = cardTitles[cardIdx];
      
      const vagaCard = figma.createFrame();
      vagaCard.name = `Card: ${card.title}`;
      vagaCard.resize(312, 340);
      vagaCard.fills = [{type: 'SOLID', color: {r: 0.1, g: 0.1, b: 0.12}}];
      vagaCard.cornerRadius = 8;
      vagaCard.layoutMode = "VERTICAL";
      vagaCard.itemSpacing = 12;
      vagaCard.paddingLeft = 16;
      vagaCard.paddingRight = 16;
      vagaCard.paddingTop = 16;
      vagaCard.paddingBottom = 16;
      
      // Header com fonte, date, score, heart
      const cardHeader = figma.createFrame();
      cardHeader.name = "Header";
      cardHeader.resize(280, 24);
      cardHeader.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}, opacity: 0}];
      cardHeader.layoutMode = "HORIZONTAL";
      cardHeader.itemSpacing = 8;
      
      const sourceText = figma.createText();
      sourceText.characters = card.source;
      sourceText.fontSize = 11;
      sourceText.fills = [{type: 'SOLID', color: {r: 0.628, g: 0.628, b: 0.665}}];
      cardHeader.appendChild(sourceText);
      
      const scoreText = figma.createText();
      scoreText.characters = `${card.score}%`;
      scoreText.fontSize = 12;
      scoreText.fontWeight = 700;
      scoreText.fills = [{type: 'SOLID', color: {r: 0.34, g: 0.78, b: 0.35}}];
      cardHeader.appendChild(scoreText);
      
      vagaCard.appendChild(cardHeader);
      
      // Title
      const titleText = figma.createText();
      titleText.characters = card.title;
      titleText.fontSize = 14;
      titleText.fontWeight = 600;
      titleText.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
      titleText.textTruncate = "ENDING";
      vagaCard.appendChild(titleText);
      
      // Company
      const companyText = figma.createText();
      companyText.characters = "Empresa Confidencial";
      companyText.fontSize = 12;
      companyText.fills = [{type: 'SOLID', color: {r: 0.628, g: 0.628, b: 0.665}}];
      vagaCard.appendChild(companyText);
      
      // Tags
      const tagsFrame = figma.createFrame();
      tagsFrame.name = "Tags";
      tagsFrame.resize(280, 24);
      tagsFrame.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}, opacity: 0}];
      tagsFrame.layoutMode = "HORIZONTAL";
      tagsFrame.itemSpacing = 6;
      
      const tags = ["Figma", "Notion"];
      tags.forEach(tag => {
        const tagEl = figma.createFrame();
        tagEl.resize(50, 20);
        tagEl.fills = [{type: 'SOLID', color: {r: 0.15, g: 0.15, b: 0.18}}];
        tagEl.cornerRadius = 4;
        const tagText = figma.createText();
        tagText.characters = tag;
        tagText.fontSize = 10;
        tagText.fills = [{type: 'SOLID', color: {r: 0.628, g: 0.628, b: 0.665}}];
        tagEl.appendChild(tagText);
        tagsFrame.appendChild(tagEl);
      });
      vagaCard.appendChild(tagsFrame);
      
      // Actions
      const actionsFrame = figma.createFrame();
      actionsFrame.name = "Actions";
      actionsFrame.resize(280, 32);
      actionsFrame.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}, opacity: 0}];
      actionsFrame.layoutMode = "HORIZONTAL";
      actionsFrame.itemSpacing = 8;
      
      const actionBtns = ["Pendente", "✨", "Aplicar"];
      actionBtns.forEach(btn => {
        const btnEl = figma.createFrame();
        btnEl.resize(85, 28);
        btnEl.fills = [{type: 'SOLID', color: {r: 0.25, g: 0.25, b: 0.28}}];
        btnEl.cornerRadius = 6;
        const btnText = figma.createText();
        btnText.characters = btn;
        btnText.fontSize = 11;
        btnText.fills = [{type: 'SOLID', color: {r: 1, g: 1, b: 1}}];
        btnEl.appendChild(btnText);
        actionsFrame.appendChild(btnEl);
      });
      vagaCard.appendChild(actionsFrame);
      
      row.appendChild(vagaCard);
    }
    
    cardsGrid.appendChild(row);
  }
  
  content.appendChild(cardsGrid);
  main.appendChild(content);
  
  artboard.appendChild(main);
  figma.currentPage.appendChild(artboard);
  
  console.log("✅ Dashboard 1:1 criado com sucesso!");
})();
"""

async def inject_dashboard():
    """Conecta ao Figma Bridge e injeta o dashboard"""
    try:
        async with websockets.connect(FIGMA_BRIDGE_URL) as websocket:
            print("✅ Conectado ao Figma Bridge")
            
            # Enviar código para executar no Figma
            message = {
                "type": "execute_code",
                "code": DASHBOARD_CODE
            }
            
            await websocket.send(json.dumps(message))
            print("📤 Código enviado para Figma")
            
            # Aguardar resposta
            response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            print(f"📨 Resposta: {response}")
            
            return True
            
    except asyncio.TimeoutError:
        print("⏱️ Timeout ao aguardar resposta do Figma")
        return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(inject_dashboard())
    sys.exit(0 if result else 1)

