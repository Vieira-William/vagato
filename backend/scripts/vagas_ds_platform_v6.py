import json
import urllib.request

def send(js):
    req = urllib.request.Request(
        'http://localhost:9999/execute',
        data=json.dumps({"code": js}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as r:
        r.read()

# =============================================================
# V6 — 1:1 com o código real
# Lido linha a linha de: Sidebar.jsx, Dashboard.jsx,
#   VagaCard.jsx, StatCard.jsx, Filtros.jsx, index.css, tailwind.config.js
#
# Dark mode tokens (index.css .dark):
#   --bg-primary:   #0f0f12
#   --bg-secondary: #1a1a1f  (cards, sidebar, header)
#   --bg-tertiary:  #252529  (inputs, badges, hover)
#   --border:       #2e2e33
#   --text-primary: #ffffff
#   --text-secondary: #a1a1aa
#   --text-muted:   #71717a
#
# Accent colors (tailwind.config.js):
#   primary:  #6366f1
#   success:  #22c55e
#   warning:  #f59e0b
#   danger:   #ef4444
#   info:     #06b6d4
#   purple:   #a855f7
#
# Layout (Layout.jsx):
#   Sidebar: fixed left-0, w-56 (224px) expanded
#   Main: ml-56 (224px)
#
# Dashboard layout: h-screen flex flex-col
#   Header: flex-shrink-0 border-b bg-secondary
#     [1] Stats row: flex gap-3 px-4 py-3 border-b  (~56px h)
#     [2] Toolbar:   flex items-center gap-3 px-4 py-2 border-b (~36px h)
#     [3] Tabs row:  flex items-center justify-between px-4 (~40px h)
#   Content: flex-1 flex overflow-hidden
#     Filter sidebar: w-56 border-r bg-secondary (224px)
#     Main: flex-1 p-4 — grid xl:grid-cols-3 gap-3
# =============================================================

PAYLOAD = r"""
(async () => {
try {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // ─── HELPERS ─────────────────────────────────────────────
  const rgb = h => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return r ? { r: parseInt(r[1],16)/255, g: parseInt(r[2],16)/255, b: parseInt(r[3],16)/255 } : {r:0,g:0,b:0};
  };
  const fill  = (h, op=1) => [{ type:"SOLID", color:rgb(h), opacity:op }];
  const noFill = () => [];

  // Criar texto com estilo exato
  const mkT = (str, size, style, color, maxW) => {
    const t = figma.createText();
    t.fontName = { family:"Inter", style };
    t.characters = String(str);
    t.fontSize = size;
    t.fills = fill(color);
    if (maxW) { t.textAutoResize="HEIGHT"; t.resize(maxW, 20); }
    return t;
  };

  // Frame auto-layout helper
  const mkF = (opts={}) => {
    const f = figma.createFrame();
    f.fills = opts.bg ? fill(opts.bg, opts.bgOp||1) : noFill();
    if (opts.layout) {
      f.layoutMode = opts.layout; // "HORIZONTAL" | "VERTICAL"
      f.primaryAxisSizingMode = opts.wFixed ? "FIXED" : "AUTO";
      f.counterAxisSizingMode = opts.hFixed ? "FIXED" : "AUTO";
      if (opts.gap !== undefined) f.itemSpacing = opts.gap;
      if (opts.pl !== undefined) f.paddingLeft = opts.pl;
      if (opts.pr !== undefined) f.paddingRight = opts.pr;
      if (opts.pt !== undefined) f.paddingTop = opts.pt;
      if (opts.pb !== undefined) f.paddingBottom = opts.pb;
      if (opts.alignMain) f.primaryAxisAlignItems = opts.alignMain;
      if (opts.alignCross) f.counterAxisAlignItems = opts.alignCross;
      if (opts.grow) f.layoutGrow = opts.grow;
      if (opts.alignSelf) f.layoutAlign = opts.alignSelf;
    }
    if (opts.w) f.resize(opts.w, opts.h || f.height);
    if (opts.h && !opts.w) f.resize(f.width, opts.h);
    if (opts.w && opts.h) f.resize(opts.w, opts.h);
    if (opts.r !== undefined) f.cornerRadius = opts.r;
    if (opts.stroke) { f.strokes = fill(opts.stroke, opts.strokeOp||1); f.strokeWeight = opts.strokeW||1; f.strokeAlign = "INSIDE"; }
    if (opts.name) f.name = opts.name;
    return f;
  };

  // Icon placeholder (representação de ícone Lucide)
  const mkIcon = (size, color, shape="rect") => {
    const ic = figma.createFrame();
    ic.resize(size, size);
    if (shape === "circle") ic.cornerRadius = size/2;
    else ic.cornerRadius = Math.floor(size*0.2);
    ic.fills = fill(color, 0.8);
    ic.name = "Icon";
    return ic;
  };

  // Pill / Badge
  const mkBadge = (label, textColor, bgColor, bgOp=1, border=null) => {
    const b = mkF({ layout:"HORIZONTAL", pl:8, pr:8, pt:2, pb:2, r:99, bg:bgColor, bgOp });
    if (border) { b.strokes = fill(border); b.strokeWeight=1; b.strokeAlign="INSIDE"; }
    b.appendChild(mkT(label, 10, "Medium", textColor));
    return b;
  };

  // ─── PAGE ────────────────────────────────────────────────
  let pg = figma.root.children.find(n => n.name === "[SYSTEM] Design System");
  if (!pg) { pg = figma.createPage(); pg.name = "[SYSTEM] Design System"; }
  figma.currentPage = pg;
  const old = pg.children.find(n => n.name === "💻 Dashboard V6");
  if (old) old.remove();

  // ─── CANVAS FRAME: 1440×900 (MacBook Air 13") ────────────
  // Sidebar(224) + Main content(1216) = 1440
  const ROOT = mkF({ name:"💻 Dashboard V6", layout:"HORIZONTAL", bg:"#0f0f12",
    wFixed:true, hFixed:true, w:1440, h:900 });
  ROOT.x = 3400; ROOT.y = 0;

  // ═══════════════════════════════════════════════════════
  // 1. SIDEBAR — w-56 (224px), bg-secondary, border-r
  //    Sidebar.jsx: fixed left-0 top-0 h-full
  //    Header: h-16 (64px) px-3 border-b
  //      Logo: w-8 h-8 rounded-lg bg-accent-primary + Target icon (w-5 h-5)
  //      "Vagas UX" font-bold
  //      PanelLeftClose icon
  //    Nav: flex-1 py-4 px-2 space-y-1
  //      Items: px-3 py-2.5 rounded-lg flex items-center gap-3
  //        Active: bg-accent-primary text-white
  //        Inactive: text-secondary
  //    Bottom: p-2 border-t
  //      Theme toggle: px-3 py-2.5
  // ═══════════════════════════════════════════════════════
  const sidebar = mkF({ name:"Sidebar", layout:"VERTICAL", bg:"#1a1a1f",
    wFixed:true, hFixed:true, w:224, h:900,
    stroke:"#2e2e33" });

  // Sidebar Header — h-16 (64px) px-3 border-b
  const sbHead = mkF({ name:"Sidebar Header", layout:"HORIZONTAL", bg:"#1a1a1f",
    wFixed:true, hFixed:true, w:224, h:64, pl:12, pr:12,
    alignCross:"CENTER", alignMain:"SPACE_BETWEEN",
    stroke:"#2e2e33" });

  const logoRow = mkF({ layout:"HORIZONTAL", gap:12, alignCross:"CENTER" });
  const logoBg = mkF({ bg:"#6366f1", r:8, w:32, h:32, alignCross:"CENTER", alignMain:"CENTER" });
  const targetIco = mkIcon(20, "#ffffff", "rect"); targetIco.x=6; targetIco.y=6;
  logoBg.appendChild(targetIco);
  logoRow.appendChild(logoBg);
  logoRow.appendChild(mkT("Vagas UX", 14, "Bold", "#ffffff"));
  sbHead.appendChild(logoRow);
  const collapseBtn = mkF({ bg:"#252529", r:8, w:28, h:28 });
  sbHead.appendChild(collapseBtn);
  sidebar.appendChild(sbHead);

  // Nav items: LayoutDashboard, User, BarChart3, Settings
  const navItems = [
    { label:"Dashboard", active:true },
    { label:"Meu Perfil", active:false },
    { label:"Match", active:false },
    { label:"Configurações", active:false },
  ];
  const navArea = mkF({ name:"Nav", layout:"VERTICAL", pt:16, pb:16, pl:8, pr:8, gap:4,
    wFixed:true, hFixed:false, w:224 });
  navItems.forEach(item => {
    const row = mkF({ layout:"HORIZONTAL", gap:12, pl:12, pr:12, pt:10, pb:10, r:8,
      alignCross:"CENTER",
      bg: item.active ? "#6366f1" : "transparent",
      wFixed:true, hFixed:true, w:208, h:40 });
    row.fills = item.active ? fill("#6366f1") : noFill();
    const navIcon = mkIcon(20, item.active ? "#ffffff" : "#a1a1aa");
    row.appendChild(navIcon);
    row.appendChild(mkT(item.label, 14, item.active ? "Semi Bold" : "Medium",
      item.active ? "#ffffff" : "#a1a1aa"));
    navArea.appendChild(row);
  });
  sidebar.appendChild(navArea);

  // Spacer
  const sbSpacer = figma.createFrame(); sbSpacer.resize(224, 1); sbSpacer.fills = noFill();
  sbSpacer.layoutGrow = 1; sidebar.appendChild(sbSpacer);

  // Bottom: theme toggle — p-2 border-t
  const sbBottom = mkF({ name:"Sidebar Bottom", layout:"VERTICAL", bg:"#1a1a1f",
    wFixed:true, hFixed:true, w:224, h:52, pl:8, pr:8, pt:8, pb:8,
    stroke:"#2e2e33" });
  const themeBtn = mkF({ layout:"HORIZONTAL", gap:12, pl:12, pr:12, pt:10, pb:10, r:8,
    alignCross:"CENTER", wFixed:true, hFixed:true, w:208, h:36 });
  themeBtn.fills = noFill();
  const sunIco = mkIcon(20, "#a1a1aa", "circle");
  themeBtn.appendChild(sunIco);
  themeBtn.appendChild(mkT("Light Mode", 14, "Medium", "#a1a1aa"));
  sbBottom.appendChild(themeBtn);
  sidebar.appendChild(sbBottom);
  ROOT.appendChild(sidebar);

  // ═══════════════════════════════════════════════════════
  // 2. MAIN AREA — 1216px (1440-224)
  //    Dashboard.jsx: h-screen flex flex-col bg-[var(--bg-primary)]
  // ═══════════════════════════════════════════════════════
  const main = mkF({ name:"Main Area", layout:"VERTICAL", bg:"#0f0f12",
    wFixed:true, hFixed:true, w:1216, h:900 });

  // ── HEADER: flex-shrink-0 border-b bg-secondary ────────
  const header = mkF({ name:"Header", layout:"VERTICAL", bg:"#1a1a1f",
    wFixed:true, hFixed:false, w:1216, stroke:"#2e2e33" });

  // ── [1] STATS ROW: flex gap-3 px-4 py-3 border-b ──────
  // StatCard.jsx: card flex-1 min-w-[160px] py-3 px-4
  //   layout: flex items-center justify-between gap-3
  //   Left: icon(p-1.5 rounded-lg bg-{color}/10, Icon w-4h-4) + title(text-xs text-secondary)
  //   Right: value(text-xl font-bold text-{color})
  // .card = bg-secondary border border-border rounded-2xl p-5 (overridden to py-3 px-4)
  const statsRow = mkF({ name:"Stats Row", layout:"HORIZONTAL", bg:"#1a1a1f",
    wFixed:true, hFixed:true, w:1216, h:56, pl:16, pr:16, pt:12, pb:12, gap:12,
    stroke:"#2e2e33" });

  const statDefs = [
    { title:"Total", value:"114", color:"#6366f1", icon:"primary" },
    { title:"Pendentes", value:"89", color:"#f59e0b", icon:"warning" },
    { title:"Aplicadas", value:"3", color:"#22c55e", icon:"success" },
    { title:"24h", value:"12", color:"#06b6d4", icon:"info" },
    { title:"Destaques", value:"8", color:"#22c55e", icon:"success" },
  ];
  statDefs.forEach(sd => {
    // card: bg-secondary border border-border rounded-2xl, py-3 px-4
    const card = mkF({ layout:"HORIZONTAL", bg:"#1a1a1f", r:16,
      pl:16, pr:16, pt:12, pb:12, gap:12,
      alignCross:"CENTER", alignMain:"SPACE_BETWEEN",
      stroke:"#2e2e33" });
    card.layoutGrow = 1;
    // Left: icon + title
    const left = mkF({ layout:"HORIZONTAL", gap:10, alignCross:"CENTER" });
    const iconBg = mkF({ bg: sd.color, bgOp:0.1, r:8, w:28, h:28, layout:"HORIZONTAL", alignCross:"CENTER", alignMain:"CENTER" });
    const ico = mkIcon(16, sd.color); ico.cornerRadius=4;
    iconBg.appendChild(ico);
    left.appendChild(iconBg);
    left.appendChild(mkT(sd.title, 12, "Regular", "#a1a1aa"));
    card.appendChild(left);
    // Right: value
    card.appendChild(mkT(sd.value, 20, "Bold", sd.color));
    statsRow.appendChild(card);
  });
  header.appendChild(statsRow);

  // ── [2] TOOLBAR ROW: flex items-center gap-3 px-4 py-2 border-b ──
  // Contains: Período dropdown | Search | Ordenação | PorPágina | Grid/List | [ml-auto] Atualizar Vagas
  const toolbar = mkF({ name:"Toolbar", layout:"HORIZONTAL", bg:"#1a1a1f",
    wFixed:true, hFixed:true, w:1216, h:36, pl:16, pr:16, pt:8, pb:8, gap:12,
    alignCross:"CENTER", stroke:"#2e2e33" });

  // Período button: px-3 py-1.5 bg-tertiary rounded-lg text-xs text-secondary
  const periodoBtn = mkF({ layout:"HORIZONTAL", bg:"#252529", r:8, pl:12, pr:12, pt:6, pb:6, gap:8, alignCross:"CENTER" });
  periodoBtn.appendChild(mkIcon(14, "#71717a"));
  periodoBtn.appendChild(mkT("Todo período", 12, "Regular", "#a1a1aa"));
  periodoBtn.appendChild(mkIcon(10, "#71717a"));
  toolbar.appendChild(periodoBtn);

  // Search: flex-1 max-w-md — pl-8 pr-3 py-1.5 bg-tertiary rounded-lg text-xs
  const searchF = mkF({ layout:"HORIZONTAL", bg:"#252529", r:8, pl:28, pr:12, pt:6, pb:6, gap:0,
    alignCross:"CENTER", wFixed:true, hFixed:true, w:280, h:28 });
  const searchIco = mkIcon(14, "#71717a"); searchIco.name="Search Icon";
  searchF.appendChild(mkT("Buscar...", 12, "Regular", "#71717a"));
  toolbar.appendChild(searchF);

  // Ordenação: px-2.5 py-1.5 bg-tertiary rounded-lg
  const ordBtn = mkF({ layout:"HORIZONTAL", bg:"#252529", r:8, pl:10, pr:10, pt:6, pb:6, gap:6, alignCross:"CENTER" });
  ordBtn.appendChild(mkIcon(14, "#71717a"));
  ordBtn.appendChild(mkT("Compatibilidade", 12, "Regular", "#a1a1aa"));
  ordBtn.appendChild(mkIcon(10, "#71717a"));
  toolbar.appendChild(ordBtn);

  // Por página toggle: bg-tertiary p-0.5 rounded-lg, buttons inside
  const ppToggle = mkF({ layout:"HORIZONTAL", bg:"#252529", r:8, pl:2, pr:2, pt:2, pb:2, gap:0 });
  ["9","12","24","48"].forEach((v,i) => {
    const btn = mkF({ layout:"HORIZONTAL", r:6, pl:8, pr:8, pt:4, pb:4 });
    btn.fills = i===1 ? fill("#1a1a1f") : noFill(); // 12 is default selected
    btn.appendChild(mkT(v, 10, i===1 ? "Semi Bold" : "Medium", i===1 ? "#ffffff" : "#71717a"));
    ppToggle.appendChild(btn);
  });
  toolbar.appendChild(ppToggle);

  // Grid/List toggle
  const glToggle = mkF({ layout:"HORIZONTAL", bg:"#252529", r:8, pl:2, pr:2, pt:2, pb:2, gap:0 });
  const gridBtn = mkF({ layout:"HORIZONTAL", r:6, pl:6, pr:6, pt:6, pb:6, bg:"#1a1a1f" });
  gridBtn.appendChild(mkIcon(14, "#ffffff"));
  const listBtn = mkF({ layout:"HORIZONTAL", r:6, pl:6, pr:6, pt:6, pb:6 });
  listBtn.fills = noFill();
  listBtn.appendChild(mkIcon(14, "#71717a"));
  glToggle.appendChild(gridBtn); glToggle.appendChild(listBtn);
  toolbar.appendChild(glToggle);

  // Spacer (ml-auto)
  const tbSpacer = figma.createFrame(); tbSpacer.resize(1,1); tbSpacer.fills=noFill();
  tbSpacer.layoutGrow=1; toolbar.appendChild(tbSpacer);

  // "Atualizar Vagas" button: px-3 h-7 rounded-l-lg bg-accent-primary text-white text-xs
  const atualizarGrp = mkF({ layout:"HORIZONTAL", gap:0, alignCross:"CENTER" });
  const atuBtn = mkF({ layout:"HORIZONTAL", bg:"#6366f1", pl:12, pr:12, pt:0, pb:0,
    gap:6, alignCross:"CENTER", wFixed:true, hFixed:true, w:140, h:28 });
  atuBtn.cornerRadius = 8; // rounded-lg
  atuBtn.appendChild(mkIcon(14, "#ffffff", "circle"));
  atuBtn.appendChild(mkT("Atualizar Vagas", 12, "Semi Bold", "#ffffff"));
  atualizarGrp.appendChild(atuBtn);
  toolbar.appendChild(atualizarGrp);
  header.appendChild(toolbar);

  // ── [3] TABS + PAGINATION ROW: flex items-center justify-between px-4 ──
  // Left: "Filtros" button + divider + tabs (Todas/Favoritos/Destaques/Indeed/LinkedIn/Posts)
  // Right: pagination
  const tabsRow = mkF({ name:"Tabs Row", layout:"HORIZONTAL", bg:"#1a1a1f",
    wFixed:true, hFixed:true, w:1216, h:40, pl:16, pr:16,
    alignCross:"CENTER", alignMain:"SPACE_BETWEEN" });

  const tabsLeft = mkF({ layout:"HORIZONTAL", gap:0, alignCross:"CENTER" });

  // "Filtros" button: px-3 py-1.5 rounded-lg text-sm font-medium
  const filtroBtn = mkF({ layout:"HORIZONTAL", bg:"#6366f1", bgOp:0.1, r:8,
    pl:12, pr:12, pt:6, pb:6, gap:8, alignCross:"CENTER" });
  filtroBtn.appendChild(mkIcon(16, "#6366f1"));
  filtroBtn.appendChild(mkT("Filtros", 14, "Medium", "#6366f1"));
  tabsLeft.appendChild(filtroBtn);

  // Divider: h-5 w-px bg-border mx-3
  const divider = figma.createFrame(); divider.resize(1,20); divider.fills=fill("#2e2e33");
  const divWrapper = mkF({ layout:"HORIZONTAL", pl:12, pr:12 });
  divWrapper.appendChild(divider);
  tabsLeft.appendChild(divWrapper);

  // Tabs: Todas/Favoritos/Destaques/Indeed/LinkedIn/Posts
  // Active: text-primary + bottom border h-0.5 bg-accent-primary
  // Inactive: text-muted
  const tabDefs = [
    { label:"Todas", count:"114", active:true },
    { label:"Favoritos", count:"8", active:false },
    { label:"Destaques", count:"22", active:false },
    { label:"Indeed", count:"45", active:false },
    { label:"LinkedIn", count:"62", active:false },
    { label:"Posts", count:"7", active:false },
  ];
  tabDefs.forEach(tab => {
    const tabF = mkF({ layout:"VERTICAL", pl:16, pr:16, pt:0, pb:0, gap:0,
      hFixed:true, h:40, alignCross:"CENTER", alignMain:"CENTER" });
    tabF.fills = noFill();
    const tabContent = mkF({ layout:"HORIZONTAL", gap:6, alignCross:"CENTER" });
    tabContent.fills = noFill();
    tabContent.appendChild(mkT(tab.label, 14, tab.active ? "Semi Bold" : "Medium",
      tab.active ? "#ffffff" : "#71717a"));
    tabContent.appendChild(mkT(tab.count, 12, "Regular",
      tab.active ? "#a1a1aa" : "#71717a"));
    tabF.appendChild(tabContent);
    // Active indicator: absolute bottom-0 h-0.5 bg-accent-primary
    if (tab.active) {
      const indicator = figma.createFrame();
      indicator.resize(tabContent.width + 32, 2);
      indicator.fills = fill("#6366f1");
      indicator.name = "Tab Indicator";
      tabF.appendChild(indicator);
    }
    tabsLeft.appendChild(tabF);
  });
  tabsRow.appendChild(tabsLeft);

  // Pagination: chevrons + page info
  const pagRow = mkF({ layout:"HORIZONTAL", gap:4, alignCross:"CENTER" });
  pagRow.fills = noFill();
  ["«","‹","1 / 10","›","»"].forEach((v,i) => {
    const btn = mkF({ layout:"HORIZONTAL", r:6, pl:6, pr:6, pt:6, pb:6, alignCross:"CENTER", alignMain:"CENTER" });
    btn.fills = noFill();
    btn.appendChild(mkT(v, i===2?12:14, i===2?"Regular":"Medium", i===2?"#a1a1aa":"#71717a"));
    pagRow.appendChild(btn);
  });
  tabsRow.appendChild(pagRow);
  header.appendChild(tabsRow);
  main.appendChild(header);

  // ═══════════════════════════════════════════════════════
  // 3. CONTENT: flex-1 flex overflow-hidden
  //    Filter Sidebar (w-56, 224px, border-r, bg-secondary) + Main (flex-1 p-4)
  // ═══════════════════════════════════════════════════════
  const contentRow = mkF({ name:"Content", layout:"HORIZONTAL", bg:"#0f0f12",
    wFixed:true, hFixed:true, w:1216, h:764 }); // 900 - 56 - 36 - 40 - 4(borders) = 764

  // ── FILTER SIDEBAR: w-56 (224px), border-r, bg-secondary ──
  // Filtros.jsx: .card with Filter icon + h2 + selects
  // .card = bg-secondary border border-border rounded-2xl p-5
  const filterSide = mkF({ name:"Filter Sidebar", layout:"VERTICAL", bg:"#1a1a1f",
    wFixed:true, hFixed:true, w:224, h:764,
    stroke:"#2e2e33" });

  // Inner card: p-5 (20px)
  const filterCard = mkF({ layout:"VERTICAL", pl:20, pr:20, pt:20, pb:20, gap:16,
    wFixed:true, hFixed:false, w:224 });
  filterCard.fills = noFill();

  // Header: Filter icon + "Filtros"
  const filtHead = mkF({ layout:"HORIZONTAL", gap:8, alignCross:"CENTER" });
  filtHead.fills = noFill();
  filtHead.appendChild(mkIcon(16, "#71717a"));
  filtHead.appendChild(mkT("Filtros", 14, "Semi Bold", "#ffffff"));
  filterCard.appendChild(filtHead);

  // Filter groups: Fonte, Status, Modalidade, Inglês
  // label: block text-sm text-secondary mb-1.5
  // select: w-full px-3 py-2 bg-tertiary border border-border rounded-lg text-primary text-sm
  const filterGroups = [
    { label:"Fonte", options:["Todas","Indeed","LinkedIn Vagas","LinkedIn Posts"] },
    { label:"Status", options:["Todos","Pendente","Aplicada","Descartada"] },
    { label:"Modalidade", options:["Todas","Remoto","Híbrido","Presencial"] },
    { label:"Inglês", options:["Todos","Nenhum","Básico","Intermediário","Fluente"] },
  ];
  filterGroups.forEach(fg => {
    const grp = mkF({ layout:"VERTICAL", gap:6 }); grp.fills = noFill();
    grp.appendChild(mkT(fg.label, 14, "Medium", "#a1a1aa"));
    // select: w-full px-3 py-2 bg-tertiary border border-border rounded-lg
    const sel = mkF({ layout:"HORIZONTAL", bg:"#252529", r:8, pl:12, pr:12, pt:8, pb:8,
      alignCross:"CENTER", alignMain:"SPACE_BETWEEN",
      stroke:"#2e2e33", wFixed:true, hFixed:true, w:184, h:36 });
    sel.appendChild(mkT(fg.options[0], 14, "Regular", "#ffffff"));
    sel.appendChild(mkIcon(10, "#71717a"));
    grp.appendChild(sel);
    filterCard.appendChild(grp);
  });
  filterSide.appendChild(filterCard);
  contentRow.appendChild(filterSide);

  // ── MAIN CONTENT: flex-1 p-4, grid xl:grid-cols-3 gap-3 ──
  // Screen: 1216(main) - 224(filter) = 992px for cards
  // p-4 (16px each side): 992 - 32 = 960px for grid
  // grid-cols-3 gap-3(12px): (960 - 24) / 3 = 312px per card
  const cardsArea = mkF({ name:"Cards Area", layout:"VERTICAL", bg:"#0f0f12",
    wFixed:true, hFixed:true, w:992, h:764, pl:16, pr:16, pt:16, pb:16, gap:12 });

  // ── VagaCard (grid mode) — 3 per row ──
  // VagaCard.jsx grid mode: .card relative flex flex-col
  // .card = bg-secondary border border-border rounded-2xl p-5
  //
  // [Header] flex items-center justify-between mb-3
  //   Left: flex items-center gap-2 text-10px text-muted
  //     span.px-1.5 py-0.5 rounded bg-tertiary font-medium  "Indeed"/"LinkedIn"/"Posts"
  //     span  "Hoje" / "2d"
  //   Right: flex items-center gap-2
  //     ScoreBreakdown: flex items-center gap-1 px-2 py-0.5 rounded text-10px font-bold
  //       bg-success/20 text-success (if destaque) OR bg-tertiary text-muted
  //       Star icon (if destaque) + "92%"
  //     Heart button: p-1.5 rounded-full text-muted
  //
  // [Body] mb-3
  //   h3.font-semibold text-primary text-15px line-clamp-2 (title)
  //   p.text-sm text-secondary mt-1 (company)
  //   p.text-xs text-muted mt-0.5 truncate (location)
  //
  // [Tags] mb-3 — flex flex-wrap items-center gap-1.5
  //   span.px-2 py-0.5 rounded-full text-10px font-medium bg-tertiary text-secondary
  //   span.bg-success/15 text-success (for remoto/salary highlight)
  //
  // [Actions] flex items-center justify-between mt-auto pt-3 border-t border-border
  //   Left: StatusToggle (rounded-full pill) + Link2 icon
  //   Right: Sparkles (p-1.5 rounded-lg bg-purple/10 border border-purple/30 text-purple)
  //          + Aplicar link (px-3 py-1.5 rounded-lg border border-primary text-primary text-xs)

  const vagaData = [
    {
      fonte:"LinkedIn", data:"Hoje", score:"92%", destaque:true,
      titulo:"Product Designer Sênior — Design System",
      empresa:"Nubank", location:"São Paulo, SP (Remoto)",
      tags:[
        {l:"Sênior",h:false},{l:"Remoto",h:true},{l:"CLT",h:false},{l:"R$ 12k-15k",h:true}
      ],
      status:"pendente"
    },
    {
      fonte:"Indeed", data:"Ontem", score:"85%", destaque:false,
      titulo:"UX Designer Pleno — Growth & Experimentation",
      empresa:"iFood", location:"Osasco, SP (Híbrido)",
      tags:[
        {l:"Pleno",h:false},{l:"Híbrido",h:false},{l:"CLT",h:false},{l:"R$ 8k-11k",h:true}
      ],
      status:"pendente"
    },
    {
      fonte:"Posts", data:"2d", score:"78%", destaque:false,
      titulo:"UX Lead — Seller Experience & Onboarding",
      empresa:"Mercado Livre", location:"Florianópolis (Remoto)",
      tags:[
        {l:"Lead",h:false},{l:"Remoto",h:true},{l:"PJ",h:false},{l:"R$ 18k-22k",h:true}
      ],
      status:"aplicada"
    },
  ];

  // Row 1: 3 cards
  const row1 = mkF({ layout:"HORIZONTAL", gap:12, wFixed:true, hFixed:false, w:960 });
  row1.fills = noFill();

  vagaData.forEach(vd => {
    const CARD_W = 312;
    const card = mkF({ name:`VagaCard — ${vd.empresa}`, layout:"VERTICAL",
      bg:"#1a1a1f", r:16, pl:20, pr:20, pt:20, pb:20, gap:0,
      stroke:"#2e2e33", wFixed:true, hFixed:false, w:CARD_W });

    // --- Card Header: fonte + date | score + heart ---
    const ch = mkF({ layout:"HORIZONTAL", gap:0, alignCross:"CENTER", alignMain:"SPACE_BETWEEN",
      wFixed:true, hFixed:true, w:CARD_W-40, h:24 });
    ch.fills = noFill();
    // Left
    const chL = mkF({ layout:"HORIZONTAL", gap:8, alignCross:"CENTER" });
    chL.fills = noFill();
    // fonte badge: px-1.5 py-0.5 rounded bg-tertiary font-medium text-10px text-muted
    const fonteBadge = mkF({ layout:"HORIZONTAL", bg:"#252529", r:4, pl:6, pr:6, pt:2, pb:2 });
    fonteBadge.appendChild(mkT(vd.fonte, 10, "Medium", "#71717a"));
    chL.appendChild(fonteBadge);
    chL.appendChild(mkT(vd.data, 10, "Regular", "#71717a"));
    ch.appendChild(chL);
    // Right: score + heart
    const chR = mkF({ layout:"HORIZONTAL", gap:8, alignCross:"CENTER" });
    chR.fills = noFill();
    // Score badge
    const scoreBadge = mkF({ layout:"HORIZONTAL", gap:4,
      bg: vd.destaque ? "#22c55e" : "#252529", bgOp: vd.destaque ? 0.2 : 1,
      r:4, pl:8, pr:8, pt:2, pb:2, alignCross:"CENTER" });
    if (vd.destaque) scoreBadge.appendChild(mkIcon(12, "#22c55e", "circle"));
    scoreBadge.appendChild(mkT(vd.score, 10, "Bold", vd.destaque ? "#22c55e" : "#71717a"));
    chR.appendChild(scoreBadge);
    // Heart button: p-1.5 rounded-full text-muted
    const heartBtn = mkF({ layout:"HORIZONTAL", r:99, pl:6, pr:6, pt:6, pb:6,
      bg:"#252529", bgOp:0 });
    heartBtn.fills = noFill();
    heartBtn.appendChild(mkIcon(16, "#71717a", "circle"));
    chR.appendChild(heartBtn);
    ch.appendChild(chR);
    card.appendChild(ch);

    // mb-3 spacer
    const sp1 = figma.createFrame(); sp1.resize(1,12); sp1.fills=noFill(); card.appendChild(sp1);

    // --- Body: title + company + location ---
    const body = mkF({ layout:"VERTICAL", gap:4 }); body.fills=noFill();
    body.appendChild(mkT(vd.titulo, 15, "Semi Bold", "#ffffff", CARD_W-40));
    body.appendChild(mkT(vd.empresa, 14, "Regular", "#a1a1aa", CARD_W-40));
    body.appendChild(mkT(vd.location, 12, "Regular", "#71717a", CARD_W-40));
    card.appendChild(body);

    const sp2 = figma.createFrame(); sp2.resize(1,12); sp2.fills=noFill(); card.appendChild(sp2);

    // --- Tags: flex flex-wrap gap-1.5 ---
    // px-2 py-0.5 rounded-full text-10px font-medium
    // default: bg-tertiary text-secondary
    // highlight: bg-success/15 text-success
    const tagsF = mkF({ layout:"HORIZONTAL", gap:6 }); tagsF.fills=noFill();
    vd.tags.forEach(tag => {
      const t = mkF({ layout:"HORIZONTAL",
        bg: tag.h ? "#22c55e" : "#252529", bgOp: tag.h ? 0.15 : 1,
        r:99, pl:8, pr:8, pt:2, pb:2 });
      t.appendChild(mkT(tag.l, 10, "Medium", tag.h ? "#22c55e" : "#a1a1aa"));
      tagsF.appendChild(t);
    });
    card.appendChild(tagsF);

    // Spacer grows to push actions to bottom
    const sp3 = figma.createFrame(); sp3.resize(1,12); sp3.fills=noFill(); card.appendChild(sp3);

    // --- Actions: flex items-center justify-between pt-3 border-t ---
    // Left: StatusToggle + Link2 icon
    // Right: Sparkles button + "Aplicar" link
    const actBorder = figma.createFrame();
    actBorder.resize(CARD_W-40, 1); actBorder.fills=fill("#2e2e33");
    card.appendChild(actBorder);

    const sp4 = figma.createFrame(); sp4.resize(1,12); sp4.fills=noFill(); card.appendChild(sp4);

    const acts = mkF({ layout:"HORIZONTAL", gap:0, alignCross:"CENTER", alignMain:"SPACE_BETWEEN",
      wFixed:true, hFixed:true, w:CARD_W-40, h:28 });
    acts.fills = noFill();

    // Left: StatusToggle
    const statusConfig = {
      pendente: { bg:"#f59e0b", text:"#f59e0b", label:"Pendente" },
      aplicada: { bg:"#22c55e", text:"#22c55e", label:"Aplicada" },
    };
    const sc = statusConfig[vd.status] || statusConfig.pendente;
    const statusToggle = mkF({ layout:"HORIZONTAL", gap:6, r:99,
      bg:sc.bg, bgOp:0.15, pl:10, pr:10, pt:4, pb:4, alignCross:"CENTER" });
    statusToggle.appendChild(mkIcon(14, sc.text, "circle"));
    statusToggle.appendChild(mkT(sc.label, 10, "Semi Bold", sc.text));
    acts.appendChild(statusToggle);

    // Right: Sparkles + Aplicar
    const actsR = mkF({ layout:"HORIZONTAL", gap:8, alignCross:"CENTER" }); actsR.fills=noFill();
    // Sparkles: p-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/30
    const sparkBtn = mkF({ layout:"HORIZONTAL", bg:"#a855f7", bgOp:0.1,
      r:8, pl:6, pr:6, pt:6, pb:6,
      stroke:"#a855f7", strokeOp:0.3, wFixed:true, hFixed:true, w:28, h:28 });
    sparkBtn.appendChild(mkIcon(16, "#a855f7"));
    actsR.appendChild(sparkBtn);
    // Aplicar link: px-3 py-1.5 rounded-lg border border-primary text-primary text-xs
    const aplicarBtn = mkF({ layout:"HORIZONTAL", gap:6, r:8, pl:12, pr:12, pt:6, pb:6,
      stroke:"#6366f1", alignCross:"CENTER" });
    aplicarBtn.fills = noFill();
    aplicarBtn.appendChild(mkT("Aplicar", 12, "Medium", "#6366f1"));
    aplicarBtn.appendChild(mkIcon(12, "#6366f1"));
    actsR.appendChild(aplicarBtn);
    acts.appendChild(actsR);
    card.appendChild(acts);

    row1.appendChild(card);
  });
  cardsArea.appendChild(row1);

  // Row 2: 3 more cards (same structure, different data)
  const vagaData2 = [
    {
      fonte:"LinkedIn", data:"3d", score:"74%", destaque:false,
      titulo:"Product Designer — Mobile & Consumer Apps",
      empresa:"PicPay", location:"Remoto",
      tags:[{l:"Pleno",h:false},{l:"Remoto",h:true},{l:"CLT",h:false}],
      status:"pendente"
    },
    {
      fonte:"Indeed", data:"4d", score:"71%", destaque:false,
      titulo:"UX/UI Designer — Plataforma B2B SaaS",
      empresa:"TOTVS", location:"São Paulo, SP (Híbrido)",
      tags:[{l:"Pleno",h:false},{l:"Híbrido",h:false},{l:"CLT",h:false},{l:"R$ 7k-9k",h:false}],
      status:"pendente"
    },
    {
      fonte:"Posts", data:"5d", score:"68%", destaque:false,
      titulo:"Senior UX Designer — Fintech Products",
      empresa:"Itaú Unibanco", location:"São Paulo (Híbrido)",
      tags:[{l:"Sênior",h:false},{l:"Híbrido",h:false},{l:"CLT",h:false}],
      status:"pendente"
    },
  ];

  const row2 = mkF({ layout:"HORIZONTAL", gap:12, wFixed:true, hFixed:false, w:960 });
  row2.fills = noFill();
  vagaData2.forEach(vd => {
    const CARD_W = 312;
    const card = mkF({ name:`VagaCard — ${vd.empresa}`, layout:"VERTICAL",
      bg:"#1a1a1f", r:16, pl:20, pr:20, pt:20, pb:20, gap:0,
      stroke:"#2e2e33", wFixed:true, hFixed:false, w:CARD_W });

    const ch = mkF({ layout:"HORIZONTAL", gap:0, alignCross:"CENTER", alignMain:"SPACE_BETWEEN",
      wFixed:true, hFixed:true, w:CARD_W-40, h:24 });
    ch.fills = noFill();
    const chL = mkF({ layout:"HORIZONTAL", gap:8, alignCross:"CENTER" }); chL.fills=noFill();
    const fb = mkF({ layout:"HORIZONTAL", bg:"#252529", r:4, pl:6, pr:6, pt:2, pb:2 });
    fb.appendChild(mkT(vd.fonte, 10, "Medium", "#71717a")); chL.appendChild(fb);
    chL.appendChild(mkT(vd.data, 10, "Regular", "#71717a")); ch.appendChild(chL);
    const chR = mkF({ layout:"HORIZONTAL", gap:8, alignCross:"CENTER" }); chR.fills=noFill();
    const sb2 = mkF({ layout:"HORIZONTAL", bg:"#252529", r:4, pl:8, pr:8, pt:2, pb:2 });
    sb2.appendChild(mkT(vd.score, 10, "Bold", "#71717a")); chR.appendChild(sb2);
    const hb = mkF({ layout:"HORIZONTAL", r:99, pl:6, pr:6, pt:6, pb:6 }); hb.fills=noFill();
    hb.appendChild(mkIcon(16, "#71717a", "circle")); chR.appendChild(hb);
    ch.appendChild(chR); card.appendChild(ch);

    const sp1 = figma.createFrame(); sp1.resize(1,12); sp1.fills=noFill(); card.appendChild(sp1);

    const body = mkF({ layout:"VERTICAL", gap:4 }); body.fills=noFill();
    body.appendChild(mkT(vd.titulo, 15, "Semi Bold", "#ffffff", CARD_W-40));
    body.appendChild(mkT(vd.empresa, 14, "Regular", "#a1a1aa", CARD_W-40));
    body.appendChild(mkT(vd.location, 12, "Regular", "#71717a", CARD_W-40));
    card.appendChild(body);

    const sp2 = figma.createFrame(); sp2.resize(1,12); sp2.fills=noFill(); card.appendChild(sp2);

    const tagsF = mkF({ layout:"HORIZONTAL", gap:6 }); tagsF.fills=noFill();
    vd.tags.forEach(tag => {
      const t = mkF({ layout:"HORIZONTAL", bg:"#252529", r:99, pl:8, pr:8, pt:2, pb:2 });
      t.appendChild(mkT(tag.l, 10, "Medium", "#a1a1aa")); tagsF.appendChild(t);
    });
    card.appendChild(tagsF);

    const sp3 = figma.createFrame(); sp3.resize(1,12); sp3.fills=noFill(); card.appendChild(sp3);
    const aborder = figma.createFrame(); aborder.resize(CARD_W-40,1); aborder.fills=fill("#2e2e33"); card.appendChild(aborder);
    const sp4 = figma.createFrame(); sp4.resize(1,12); sp4.fills=noFill(); card.appendChild(sp4);

    const acts = mkF({ layout:"HORIZONTAL", gap:0, alignCross:"CENTER", alignMain:"SPACE_BETWEEN",
      wFixed:true, hFixed:true, w:CARD_W-40, h:28 });
    acts.fills=noFill();
    const stgl = mkF({ layout:"HORIZONTAL", gap:6, r:99,
      bg:"#f59e0b", bgOp:0.15, pl:10, pr:10, pt:4, pb:4, alignCross:"CENTER" });
    stgl.appendChild(mkIcon(14, "#f59e0b", "circle"));
    stgl.appendChild(mkT("Pendente", 10, "Semi Bold", "#f59e0b"));
    acts.appendChild(stgl);
    const acR = mkF({ layout:"HORIZONTAL", gap:8, alignCross:"CENTER" }); acR.fills=noFill();
    const sprkB = mkF({ layout:"HORIZONTAL", bg:"#a855f7", bgOp:0.1, r:8, pl:6, pr:6, pt:6, pb:6,
      stroke:"#a855f7", strokeOp:0.3, wFixed:true, hFixed:true, w:28, h:28 });
    sprkB.appendChild(mkIcon(16, "#a855f7")); acR.appendChild(sprkB);
    const aplB = mkF({ layout:"HORIZONTAL", gap:6, r:8, pl:12, pr:12, pt:6, pb:6, stroke:"#6366f1" });
    aplB.fills=noFill();
    aplB.appendChild(mkT("Aplicar", 12, "Medium", "#6366f1"));
    aplB.appendChild(mkIcon(12, "#6366f1")); acR.appendChild(aplB);
    acts.appendChild(acR); card.appendChild(acts);
    row2.appendChild(card);
  });
  cardsArea.appendChild(row2);

  contentRow.appendChild(cardsArea);
  main.appendChild(contentRow);
  ROOT.appendChild(main);

  // ─── RENDER ────────────────────────────────────────────
  pg.appendChild(ROOT);
  figma.viewport.scrollAndZoomIntoView([ROOT]);
  console.log("✅ Dashboard V6 — fiel ao código real — criado!");

} catch(e) { console.error("❌ V6 Crash:", e.message, e.stack); throw e; }
})();
"""

if __name__ == "__main__":
    print("🎯 SENTINELA V6 — Lido o código real linha a linha")
    print("   Sidebar.jsx, Dashboard.jsx, VagaCard.jsx, StatCard.jsx, Filtros.jsx")
    print("   index.css (dark tokens), tailwind.config.js (accent colors)")
    send(PAYLOAD)
    print("✅ Dashboard V6 disparado!")
