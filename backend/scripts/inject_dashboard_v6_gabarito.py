#!/usr/bin/env python3
"""
Dashboard 1:1 Final v6 - Based on EXACT user screenshot gabarito
Sidebar collapsed (icons only), 3-column cards, dropdowns, proper toolbar
"""
import json, urllib.request, sys

FIGMA_BRIDGE_URL = "http://localhost:9999/execute"
FIGMA_TOKEN = "figd_4q31rYG3GKKr6Kr1lgne793KQ26qQXvYwyvdk7Rm"
FIGMA_FILE = "46upQ0yYDHuJqssvTT4Pxp"

JS_CODE = r"""
(async () => {
  try {
    for (const s of ["Regular","Medium","Semi Bold","Bold"]) {
      try { await figma.loadFontAsync({family:"Inter", style:s}); } catch(e) {}
    }

    const rgb = h => { const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r?{r:parseInt(r[1],16)/255,g:parseInt(r[2],16)/255,b:parseInt(r[3],16)/255}:{r:0,g:0,b:0}; };
    const fill = (h,op=1) => [{type:"SOLID",color:rgb(h),opacity:op}];

    const ICONS = {
        grid: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        user: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        heart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        settings: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        briefcase: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
        clock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        trending: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
        star: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        chevron: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
        calendar: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        search: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        sort: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
        filter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
        zap: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        external: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        refresh: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
        list: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        bookmark: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
        barChart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
        sparkle: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.912 5.813h6.112l-4.968 3.587 1.912 5.813L12 14.626l-4.968 3.587 1.912-5.813L3.976 8.813h6.112z"/></svg>',
        chevronDown: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
        chevronL: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
        chevronR: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
        chevronsL: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>',
        chevronsR: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>'
    };

    function icon(name, size, color) {
        const svg = ICONS[name] || ICONS.grid;
        const n = figma.createNodeFromSvg(svg);
        n.name = name; n.resize(size, size); n.layoutAlign = "INHERIT";
        const c = fill(color)[0];
        const paint = (nd) => {
            if (nd.type==="VECTOR"||nd.type==="BOOLEAN_OPERATION") { if(nd.strokes.length>0) nd.strokes=[c]; if(nd.fills.length>0&&nd.fills[0].type==="SOLID") nd.fills=[c]; }
            if (nd.children) nd.children.forEach(paint);
        }; paint(n); return n;
    }

    function F(opts) {
      const f = figma.createFrame();
      f.name = opts.n || "Frame";
      f.fills = opts.bg ? fill(opts.bg, opts.bgOp||1) : [];
      f.resize(opts.w || 1, opts.h || 1);
      if (opts.r !== undefined) f.cornerRadius = opts.r;
      if (opts.stroke) { f.strokes=fill(opts.stroke,opts.sOp||1); f.strokeWeight=opts.sw||1; f.strokeAlign="INSIDE"; }
      if (opts.shadow) { f.effects=[{type:"DROP_SHADOW",color:{r:0,g:0,b:0,a:0.08},offset:{x:0,y:2},radius:8,spread:0,visible:true,blendMode:"NORMAL"}]; }
      f.clipsContent = !!opts.clip;
      if (opts.d) {
        f.layoutMode = opts.d;
        f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
        if (opts.d==="HORIZONTAL") {
            if (opts.w) f.primaryAxisSizingMode="FIXED";
            if (opts.h) f.counterAxisSizingMode="FIXED";
        } else {
            if (opts.h) f.primaryAxisSizingMode="FIXED";
            if (opts.w) f.counterAxisSizingMode="FIXED";
        }
        if (opts.hug==="w") { if(opts.d==="HORIZONTAL") f.primaryAxisSizingMode="AUTO"; else f.counterAxisSizingMode="AUTO"; }
        if (opts.hug==="h") { if(opts.d==="VERTICAL") f.primaryAxisSizingMode="AUTO"; else f.counterAxisSizingMode="AUTO"; }
        if (opts.hug==="both") { f.primaryAxisSizingMode="AUTO"; f.counterAxisSizingMode="AUTO"; }
        if (opts.gap!==undefined) f.itemSpacing=opts.gap;
        if (opts.p!==undefined) { f.paddingLeft=opts.p;f.paddingRight=opts.p;f.paddingTop=opts.p;f.paddingBottom=opts.p; }
        if (opts.px!==undefined) { f.paddingLeft=opts.px;f.paddingRight=opts.px; }
        if (opts.py!==undefined) { f.paddingTop=opts.py;f.paddingBottom=opts.py; }
        if (opts.pt!==undefined) f.paddingTop=opts.pt;
        if (opts.pb!==undefined) f.paddingBottom=opts.pb;
        if (opts.jc) f.primaryAxisAlignItems=opts.jc;
        if (opts.ai) f.counterAxisAlignItems=opts.ai;
        if (opts.wrap) f.layoutWrap="WRAP";
      }
      return f;
    }

    function T(s, sz, wt, col, opts={}) {
      const t = figma.createText();
      t.fontName = {family:"Inter", style:wt};
      t.characters = String(s); t.fontSize = sz; t.fills = fill(col);
      if (opts.fill) { t.layoutAlign="STRETCH"; t.textAutoResize="HEIGHT"; }
      else t.textAutoResize = "WIDTH_AND_HEIGHT";
      return t;
    }

    // Clear page
    let pg = figma.root.children.find(n => n.name.toLowerCase() === "teste");
    if(!pg) { pg = figma.createPage(); pg.name = "teste"; }
    figma.currentPage = pg;
    pg.children.forEach(n => n.remove());

    // ==========================================
    // ROOT 1440x900
    // ==========================================
    const ROOT = F({n:"Dashboard 1:1", d:"HORIZONTAL", bg:"#0f0f12", w:1440, h:900, clip:true});

    // SIDEBAR (collapsed, icons only) w-12 = 48px
    const SB = F({n:"Sidebar", d:"VERTICAL", bg:"#0f0f12", w:48, h:900, ai:"CENTER", gap:4, py:12});
    // Logo
    const logo = F({n:"Logo", d:"HORIZONTAL", w:40, h:40, bg:"#6366f1", bgOp:0.15, r:12, ai:"CENTER", jc:"CENTER"});
    logo.appendChild(icon("briefcase", 20, "#6366f1"));
    SB.appendChild(logo);

    [{i:"grid",a:true},{i:"user"},{i:"barChart"}].forEach(it => {
        const nb = F({n:it.i, d:"HORIZONTAL", w:36, h:36, r:8, ai:"CENTER", jc:"CENTER", bg: it.a?"#6366f1":undefined});
        nb.appendChild(icon(it.i, 18, it.a?"#ffffff":"#71717a"));
        SB.appendChild(nb);
    });
    // Spacer to push settings to bottom
    const sbSpacer = F({n:"spacer", d:"VERTICAL", w:1, h:1, hug:"h"});
    sbSpacer.layoutGrow = 1;
    SB.appendChild(sbSpacer);
    const settingsBtn = F({n:"settings", d:"HORIZONTAL", w:36, h:36, r:8, ai:"CENTER", jc:"CENTER"});
    settingsBtn.appendChild(icon("settings", 18, "#71717a"));
    SB.appendChild(settingsBtn);
    ROOT.appendChild(SB);

    // MAIN (1440 - 48 = 1392)
    const MAIN = F({n:"Main", d:"VERTICAL", bg:"#0f0f12", w:1392, h:900});

    // === HEADER ===
    const HDR = F({n:"Header", d:"VERTICAL", bg:"#1a1a1f", w:1392, hug:"h", stroke:"#2e2e33"});

    // Row 1: Stats (h=44)
    const STATS = F({n:"Stats", d:"HORIZONTAL", w:1392, h:44, gap:12, px:16, ai:"CENTER"});
    [{l:"Total",v:"121",c:"#6366f1",i:"briefcase"},{l:"Pendentes",v:"121",c:"#f59e0b",i:"clock"},{l:"Aplicadas",v:"0",c:"#22c55e",i:"check"},{l:"24h",v:"25",c:"#0ea5e9",i:"trending"},{l:"Destaques",v:"0",c:"#22c55e",i:"star"}].forEach(s => {
        const sc = F({n:s.l, d:"HORIZONTAL", hug:"both", h:32, bg:"#252529", r:8, px:12, gap:8, ai:"CENTER"});
        const icb = F({n:"ic", d:"HORIZONTAL", w:24, h:24, r:4, bg:s.c, bgOp:0.15, ai:"CENTER", jc:"CENTER"});
        icb.appendChild(icon(s.i, 14, s.c));
        sc.appendChild(icb);
        sc.appendChild(T(s.l, 12, "Regular", "#a1a1aa"));
        sc.appendChild(T(s.v, 16, "Bold", s.c));
        STATS.appendChild(sc);
    });
    HDR.appendChild(STATS);

    // Row 2: Toolbar (h=44)
    const TOOL = F({n:"Toolbar", d:"HORIZONTAL", w:1392, h:44, gap:8, px:16, ai:"CENTER", stroke:"#2e2e33"});
    // Periodo
    const perBtn = F({n:"Periodo", d:"HORIZONTAL", hug:"both", h:28, bg:"#252529", r:6, px:10, gap:6, ai:"CENTER"});
    perBtn.appendChild(icon("calendar",14,"#a1a1aa"));
    perBtn.appendChild(T("Todo período",11,"Regular","#a1a1aa"));
    perBtn.appendChild(icon("chevronDown",12,"#71717a"));
    TOOL.appendChild(perBtn);
    // Search
    const srch = F({n:"Busca", d:"HORIZONTAL", w:300, h:28, bg:"#252529", r:6, px:10, gap:6, ai:"CENTER"});
    srch.appendChild(icon("search",14,"#71717a"));
    srch.appendChild(T("Buscar...",11,"Regular","#71717a"));
    TOOL.appendChild(srch);
    // Spacer
    const spacer = F({n:"spacer", d:"HORIZONTAL", w:1, h:1, hug:"w"});
    spacer.layoutGrow = 1;
    TOOL.appendChild(spacer);
    // Compatibilidade
    const compBtn = F({n:"Compat", d:"HORIZONTAL", hug:"both", h:28, bg:"#252529", r:6, px:10, gap:6, ai:"CENTER"});
    compBtn.appendChild(icon("sort",14,"#a1a1aa"));
    compBtn.appendChild(T("Compatibilidade",11,"Regular","#a1a1aa"));
    compBtn.appendChild(icon("chevronDown",12,"#71717a"));
    TOOL.appendChild(compBtn);
    // Page size selector  
    const pgSel = F({n:"PerPage", d:"HORIZONTAL", hug:"both", h:28, bg:"#252529", r:6, gap:0, ai:"CENTER"});
    ["9","12","24","48"].forEach((v,i) => {
        const pb = F({n:v, d:"HORIZONTAL", hug:"both", h:28, px:8, ai:"CENTER", jc:"CENTER", bg:i===1?"#1a1a1f":undefined, r:i===1?4:0});
        pb.appendChild(T(v, 10, i===1?"Medium":"Regular", i===1?"#ffffff":"#71717a"));
        pgSel.appendChild(pb);
    });
    TOOL.appendChild(pgSel);
    // Grid/List toggle
    const viewTog = F({n:"ViewMode", d:"HORIZONTAL", hug:"both", h:28, bg:"#252529", r:6, gap:0, ai:"CENTER"});
    const vg = F({n:"Grid", d:"HORIZONTAL", w:28, h:28, ai:"CENTER", jc:"CENTER", bg:"#1a1a1f", r:4});
    vg.appendChild(icon("grid",14,"#ffffff"));
    viewTog.appendChild(vg);
    const vl = F({n:"List", d:"HORIZONTAL", w:28, h:28, ai:"CENTER", jc:"CENTER"});
    vl.appendChild(icon("list",14,"#71717a"));
    viewTog.appendChild(vl);
    TOOL.appendChild(viewTog);
    // Atualizar Vagas button
    const updBtn = F({n:"Atualizar", d:"HORIZONTAL", hug:"both", h:28, bg:"#6366f1", r:6, px:12, gap:6, ai:"CENTER"});
    updBtn.appendChild(icon("refresh",14,"#ffffff"));
    updBtn.appendChild(T("Atualizar Vagas",11,"Medium","#ffffff"));
    updBtn.appendChild(T("(cerca de 2 horas)",9,"Regular","#ffffff"));
    TOOL.appendChild(updBtn);
    HDR.appendChild(TOOL);

    // Row 3: Tabs (h=36)
    const TABS = F({n:"Tabs", d:"HORIZONTAL", w:1392, h:36, px:16, ai:"CENTER", jc:"SPACE_BETWEEN"});
    const tabsL = F({n:"TabsL", d:"HORIZONTAL", hug:"both", gap:0, ai:"CENTER"});
    // Filtros btn
    const flBtn = F({n:"FiltroBtn", d:"HORIZONTAL", hug:"both", h:28, bg:"#6366f1", bgOp:0.1, r:6, px:10, gap:6, ai:"CENTER"});
    flBtn.appendChild(icon("filter",14,"#6366f1"));
    flBtn.appendChild(T("Filtros",12,"Medium","#6366f1"));
    tabsL.appendChild(flBtn);

    [{l:"Todas",v:"121"},{l:"Favoritos",v:"0"},{l:"Destaques",v:"0"},{l:"Indeed",v:"37"},{l:"LinkedIn",v:"38"},{l:"Posts",v:"46",a:true}].forEach(t => {
        const tw = F({n:t.l, d:"VERTICAL", hug:"both", ai:"CENTER"});
        const tr = F({n:"inner", d:"HORIZONTAL", hug:"both", px:12, py:8, gap:4, ai:"CENTER"});
        tr.appendChild(T(t.l, 12, t.a?"Semi Bold":"Regular", t.a?"#ffffff":"#a1a1aa"));
        tr.appendChild(T(t.v, 10, "Regular", t.a?"#a1a1aa":"#71717a"));
        tw.appendChild(tr);
        if (t.a) tw.appendChild(F({n:"line", d:"HORIZONTAL", w:20, h:2, bg:"#6366f1"}));
        tabsL.appendChild(tw);
    });
    TABS.appendChild(tabsL);
    // Pagination
    const pgn = F({n:"Pagination", d:"HORIZONTAL", hug:"both", gap:4, ai:"CENTER"});
    pgn.appendChild(icon("chevronsL",16,"#71717a"));
    pgn.appendChild(icon("chevronL",16,"#71717a"));
    pgn.appendChild(T("1 / 4",11,"Regular","#a1a1aa"));
    pgn.appendChild(icon("chevronR",16,"#71717a"));
    pgn.appendChild(icon("chevronsR",16,"#71717a"));
    TABS.appendChild(pgn);
    HDR.appendChild(TABS);
    MAIN.appendChild(HDR);

    // === CONTENT ===
    const BODY = F({n:"Body", d:"HORIZONTAL", bg:"#0f0f12", w:1392, h:768, p:16, gap:16});

    // Filtros sidebar (dropdown style) ~140px
    const FSID = F({n:"Filtros", d:"VERTICAL", bg:"#1a1a1f", stroke:"#2e2e33", r:12, w:140, h:736, p:16, gap:20});
    FSID.appendChild(T("Filtros", 14, "Semi Bold", "#ffffff"));
    
    [["Status","Todos"],["Modalidade","Todas"],["Inglês","Todos"]].forEach(([label, val]) => {
        const grp = F({n:label, d:"VERTICAL", hug:"h", w:108, gap:8});
        grp.appendChild(T(label, 12, "Regular", "#a1a1aa"));
        const dd = F({n:"dropdown", d:"HORIZONTAL", w:108, h:32, bg:"#252529", r:6, px:10, ai:"CENTER", jc:"SPACE_BETWEEN"});
        dd.appendChild(T(val, 12, "Regular", "#ffffff"));
        dd.appendChild(icon("chevronDown",14,"#71717a"));
        grp.appendChild(dd);
        FSID.appendChild(grp);
    });
    BODY.appendChild(FSID);

    // Cards Grid (3 cols)
    const cardAreaW = 1392 - 32 - 140 - 16; // ~1204
    const GRID = F({n:"Cards Grid", d:"HORIZONTAL", w:cardAreaW, hug:"h", gap:16, wrap:true});

    const cards = [
      {t:"Product Owner", e:"TOTVS", src:"Posts", d:"Hoje", tags:["Pleno","Híbrido","CLT"], st:"Pendente"},
      {t:"Product Manager", e:"Andrade Usu", src:"Posts", d:"Hoje", tags:["Pleno","Remoto","CLT"], st:"Pendente"},
      {t:"Product Owner", e:"Empresa não informada", src:"Posts", d:"Ontem", tags:[], st:"Pendente"},
      {t:"De Estágio De UX/UI", e:"Procergs", src:"Posts", d:"Ontem", tags:[], st:"Pendente"},
      {t:"UX Writer", e:"InBot", src:"Posts", d:"Ontem", tags:["Híbrido"], st:"Pendente"},
      {t:"Designer UX/UI Júnior", e:"Empresa não informada", src:"Posts", d:"Ontem", tags:["Remoto"], st:"Pendente"},
      {t:"UX Writer", e:"Empresa Confidencial", loc:"São Paulo, SP", src:"Posts", d:"Ontem", tags:["Híbrido","R$ 4k-10k","Figma","Notion"], st:"Pendente", missao:"Criar conteúdo de interface de usuário com foco em usabilidade e experiência do cliente."},
      {t:"UX/UI Designer Pleno", e:"Intelligence Sistemas - DN", src:"Posts", d:"Ontem", tags:[], st:"Pendente"},
      {t:"Estágio De UX/UI", e:"Procergs", src:"Posts", d:"Ontem", tags:["Híbrido","Estágio"], st:"Pendente"}
    ];

    const cardW = Math.floor((cardAreaW - 32) / 3); // 3 cols with 2 gaps of 16

    cards.forEach((cd, i) => {
        const card = F({n:`Card: ${cd.t}`, d:"VERTICAL", bg:"#1a1a1f", stroke:"#2e2e33", r:16, w:cardW, hug:"h", p:20, gap:12});

        // Top row: source + date + heart
        const top = F({n:"Top", d:"HORIZONTAL", hug:"both", ai:"CENTER", jc:"SPACE_BETWEEN"});
        top.layoutAlign = "STRETCH";
        const badges = F({n:"Badges", d:"HORIZONTAL", hug:"both", gap:8, ai:"CENTER"});
        const srcB = F({n:"Src", d:"HORIZONTAL", hug:"both", px:6, py:2, bg:"#252529", r:4});
        srcB.appendChild(T(cd.src, 10, "Medium", "#71717a"));
        badges.appendChild(srcB);
        badges.appendChild(T(cd.d, 10, "Regular", "#71717a"));
        top.appendChild(badges);
        top.appendChild(icon("heart",16,"#71717a"));
        card.appendChild(top);

        // Title (text-[15px] font-semibold)
        const title = T(cd.t, 15, "Semi Bold", "#ffffff", {fill:true});
        card.appendChild(title);
        // Company (text-sm = 14px)
        card.appendChild(T(cd.e, 14, "Regular", "#a1a1aa", {fill:true}));
        // Location (if exists)
        if (cd.loc) card.appendChild(T(cd.loc, 12, "Regular", "#71717a", {fill:true}));

        // Tags
        if (cd.tags.length > 0) {
            const tRow = F({n:"Tags", d:"HORIZONTAL", hug:"both", gap:6, wrap:true});
            tRow.layoutAlign = "STRETCH";
            cd.tags.forEach(tg => {
                const isHighlight = tg.startsWith("R$") || tg === "Remoto";
                const tb = F({n:tg, d:"HORIZONTAL", hug:"both", px:8, py:2, bg: isHighlight?"#22c55e":"#252529", bgOp: isHighlight?0.15:1, r:10});
                tb.appendChild(T(tg, 10, "Regular", isHighlight?"#22c55e":"#a1a1aa"));
                tRow.appendChild(tb);
            });
            card.appendChild(tRow);
        }

        // Propósito/Missão (if exists, dashed border)
        if (cd.missao) {
            const mBox = F({n:"Missao", d:"VERTICAL", hug:"h", py:8, px:12, bg:"#252529", bgOp:0.5, r:8, stroke:"#2e2e33"});
            mBox.layoutAlign = "STRETCH";
            mBox.dashPattern = [4, 4];
            const mTxt = T(`Propósito: ${cd.missao}`, 12, "Regular", "#a1a1aa", {fill:true});
            mBox.appendChild(mTxt);
            card.appendChild(mBox);
        }

        // "Ver mais detalhes" (text-xs font-semibold)
        const vmr = F({n:"VerMais", d:"HORIZONTAL", hug:"both", gap:6, ai:"CENTER"});
        vmr.layoutAlign = "STRETCH";
        vmr.appendChild(icon("chevronDown",14,"#71717a"));
        vmr.appendChild(T("Ver mais detalhes da posição", 12, "Semi Bold", "#71717a"));
        card.appendChild(vmr);

        // Footer (mt-auto pt-3 border-t border-[var(--border)])
        const foot = F({n:"Footer", d:"HORIZONTAL", hug:"both", ai:"CENTER", jc:"SPACE_BETWEEN", pt:12, stroke:"#2e2e33"});
        foot.layoutAlign = "STRETCH";
        // Only top border - need to set individual sides
        foot.strokesIndividualStrokeWeights = {top:1, right:0, bottom:0, left:0};
        // Status
        const stb = F({n:"Status", d:"HORIZONTAL", hug:"both", px:10, py:4, bg:"#22c55e", bgOp:0.15, r:10, gap:4, ai:"CENTER"});
        stb.appendChild(icon("clock",12,"#22c55e"));
        stb.appendChild(T(cd.st, 10, "Semi Bold", "#22c55e"));
        foot.appendChild(stb);
        // Actions
        const acts = F({n:"Actions", d:"HORIZONTAL", hug:"both", gap:8, ai:"CENTER"});
        acts.appendChild(icon("sparkle",16,"#a855f7"));
        acts.appendChild(icon("bookmark",16,"#71717a"));
        // Primary CTA button
        const hasLink = cd.src === "LinkedIn" || cd.src === "Indeed";
        const ctaColor = hasLink ? "#6366f1" : "#22c55e";
        const ctaLabel = hasLink ? "Aplicar" : "Enviar DM";
        const actBtn = F({n:"Action", d:"HORIZONTAL", hug:"both", h:28, px:12, gap:4, r:8, ai:"CENTER", stroke:ctaColor});
        actBtn.appendChild(T(ctaLabel, 12, "Medium", ctaColor));
        actBtn.appendChild(icon("external",14, ctaColor));
        acts.appendChild(actBtn);
        foot.appendChild(acts);
        card.appendChild(foot);

        GRID.appendChild(card);
    });

    BODY.appendChild(GRID);
    MAIN.appendChild(BODY);
    ROOT.appendChild(MAIN);

    pg.appendChild(ROOT);
    figma.viewport.scrollAndZoomIntoView([ROOT]);
    figma.notify("✅ Dashboard v6 (Gabarito) gerado!", {timeout: 3000});
    console.log("✅ Done v6");

  } catch(err) {
    console.error("❌", err);
    figma.notify("❌ " + err.message, {timeout: 5000, error: true});
  }
})();
"""

def inject():
    payload = json.dumps({"code": JS_CODE}).encode()
    req = urllib.request.Request(FIGMA_BRIDGE_URL, data=payload, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        resp = json.loads(r.read().decode())
        print(f"Bridge: {resp}")
        return resp.get("status") == "ok"

def qa():
    """Export PNG from Figma REST API and save for comparison"""
    import time; time.sleep(5)
    # Get root node ID
    req1 = urllib.request.Request(f"https://api.figma.com/v1/files/{FIGMA_FILE}/nodes?ids=32:4&depth=1",
                                  headers={"X-Figma-Token": FIGMA_TOKEN})
    with urllib.request.urlopen(req1) as r1:
        d1 = json.loads(r1.read().decode())
        root_id = d1['nodes']['32:4']['document']['children'][0]['id']
        print(f"Root node: {root_id}")

    # Export PNG
    req2 = urllib.request.Request(f"https://api.figma.com/v1/images/{FIGMA_FILE}?ids={root_id}&format=png&scale=1",
                                  headers={"X-Figma-Token": FIGMA_TOKEN})
    with urllib.request.urlopen(req2) as r2:
        d2 = json.loads(r2.read().decode())
        img_url = d2['images'][root_id]
        print(f"Image URL: {img_url}")

    # Download
    out = "/Users/mactrabalho/.gemini/antigravity/brain/a7712cd1-7946-4aed-acf0-0a0344957a96/figma_qa_v6.png"
    urllib.request.urlretrieve(img_url, out)
    print(f"✅ QA Screenshot saved: {out}")

if __name__ == "__main__":
    if inject():
        print("Injection OK, running QA...")
        qa()
    else:
        print("❌ Injection failed")
        sys.exit(1)
