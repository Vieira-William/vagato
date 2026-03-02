#!/usr/bin/env python3
"""
Dashboard 1:1 Pixel-Perfect FULL v4 - With Icons & Perfect AutoLayout
"""

import json
import urllib.request
import sys

FIGMA_BRIDGE_URL = "http://localhost:9999/execute"

JS_CODE = r"""
(async () => {
  try {
    const fontsToLoad = [
      {family:"Inter", style:"Regular"},
      {family:"Inter", style:"Medium"},
      {family:"Inter", style:"Semi Bold"},
      {family:"Inter", style:"Bold"}
    ];
    for (const f of fontsToLoad) {
      try { await figma.loadFontAsync(f); } catch(e) { console.error("Could not load font", f.style); }
    }

    const rgb = h => { 
      const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); 
      return r?{r:parseInt(r[1],16)/255,g:parseInt(r[2],16)/255,b:parseInt(r[3],16)/255}:{r:0,g:0,b:0}; 
    };
    const fill = (h,op=1) => [{type:"SOLID",color:rgb(h),opacity:op}];
    const none = () => [];

    // --- ICON SYSTEM ---
    const ICONS = {
        grid: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
        user: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        heart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
        settings: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
        briefcase: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
        clock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        trending: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
        star: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
        chevron: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>',
        calendar: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
        search: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
        sort: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
        filter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>',
        whatsapp: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
        zap: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
    };

    function getIcon(name, size, hexColor) {
        let svgStr = ICONS[name] || ICONS["grid"];
        const node = figma.createNodeFromSvg(svgStr);
        node.name = name;
        node.resize(size, size);
        node.layoutAlign = "INHERIT";
        
        const col = fill(hexColor)[0];
        // Apply color to vector strokes
        const applyColor = (n) => {
            if (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION") {
                if (n.strokes.length > 0) n.strokes = [col];
                if (n.fills.length > 0 && n.fills[0].type === "SOLID") n.fills = [col];
            }
            if (n.children) n.children.forEach(applyColor);
        };
        applyColor(node);
        return node;
    }

    // Advanced FRAME that respects TRUE AutoLayout text wrapping
    function frame(opts) {
      const f = figma.createFrame();
      f.name = opts.name || "Frame";
      f.fills = opts.bg ? fill(opts.bg, opts.bgOp||1) : none();
      
      if (opts.w && opts.h) f.resize(opts.w, opts.h);
      if (opts.r !== undefined) f.cornerRadius = opts.r;
      if (opts.radius) {
        if(opts.radius.tl !== undefined) f.topLeftRadius = opts.radius.tl;
        if(opts.radius.tr !== undefined) f.topRightRadius = opts.radius.tr;
        if(opts.radius.bl !== undefined) f.bottomLeftRadius = opts.radius.bl;
        if(opts.radius.br !== undefined) f.bottomRightRadius = opts.radius.br;
      }
      
      if (opts.stroke) { f.strokes=fill(opts.stroke,opts.strokeOp||1); f.strokeWeight=opts.sw||1; f.strokeAlign="INSIDE"; }
      
      if (opts.dir) {
        f.layoutMode = opts.dir;
        
        if (opts.wHug) f.primaryAxisSizingMode = opts.dir === "HORIZONTAL" ? "AUTO" : "FIXED";
        if (opts.hHug) f.counterAxisSizingMode = opts.dir === "HORIZONTAL" ? "AUTO" : "FIXED";
        if (opts.dir === "VERTICAL") {
            if (opts.hHug) f.primaryAxisSizingMode = "AUTO";
            if (opts.wHug) f.counterAxisSizingMode = "AUTO";
        }

        // Always respect EXACT absolute width overrides over Auto (which breaks wrapping)
        if (opts.wFixed) f.primaryAxisSizingMode = opts.dir === "HORIZONTAL" ? "FIXED" : f.primaryAxisSizingMode;
        if (opts.hFixed) f.counterAxisSizingMode = opts.dir === "HORIZONTAL" ? "FIXED" : f.counterAxisSizingMode;
        if (opts.wFixed && opts.dir==="VERTICAL") f.counterAxisSizingMode = "FIXED";
        if (opts.hFixed && opts.dir==="VERTICAL") f.primaryAxisSizingMode = "FIXED";

        if (opts.gap!==undefined) f.itemSpacing = opts.gap;
        
        if (opts.pAll !== undefined) {
             f.paddingLeft=opts.pAll; f.paddingRight=opts.pAll; f.paddingTop=opts.pAll; f.paddingBottom=opts.pAll;
        } else {
             if (opts.pX !== undefined) { f.paddingLeft=opts.pX; f.paddingRight=opts.pX; }
             if (opts.pY !== undefined) { f.paddingTop=opts.pY; f.paddingBottom=opts.pY; }
             if (opts.pt !== undefined) f.paddingTop=opts.pt;
             if (opts.pr !== undefined) f.paddingRight=opts.pr;
             if (opts.pb !== undefined) f.paddingBottom=opts.pb;
             if (opts.pl !== undefined) f.paddingLeft=opts.pl;
        }

        if (opts.jc) f.primaryAxisAlignItems=opts.jc;
        if (opts.ai) f.counterAxisAlignItems=opts.ai;
        if (opts.wrap) f.layoutWrap = "WRAP";
        if (opts.flexFill) { f.layoutGrow = 1; }
      }
      return f;
    }

    // Text component with AutoResize to support MULTI-LINE wrapping!
    function txt(s, sz, wt, col, opts={}) {
      const t = figma.createText();
      t.fontName = {family:"Inter", style:wt};
      t.characters = String(s);
      t.fontSize = sz;
      t.fills = fill(col);
      
      if (opts.align) t.textAlignHorizontal = opts.align;
      
      if (opts.wWrap && opts.w) {
         // Auto-height wrapping trick
         t.resize(opts.w, t.height);
         t.textAutoResize = "HEIGHT"; 
      } else if (opts.wFill) {
         t.layoutAlign = "STRETCH"; // fills parent width
         t.textAutoResize = "HEIGHT"; // wraps text down
      } else {
         t.textAutoResize = "WIDTH_AND_HEIGHT";
      }

      return t;
    }

    // Limpar e criar página
    let pg = figma.root.children.find(n => n.name.toLowerCase() === "teste");
    if(!pg) { pg = figma.createPage(); pg.name = "teste"; }
    figma.currentPage = pg;
    pg.children.forEach(n => { n.remove(); });

    // ROOT: 1440×min-900
    const ROOT = frame({
      name: "Dashboard Vagas UX - React 1:1", 
      dir: "HORIZONTAL", bg: "#0f0f12", 
      w: 1440, h: 900, wFixed: true, hFixed: true, gap: 0
    });
    ROOT.x = 0; ROOT.y = 0;

    // SIDEBAR
    const SIDEBAR = frame({
      name: "Sidebar", dir: "VERTICAL", bg: "#1a1a1f",
      w: 224, h: 900, wFixed: true, hFixed: true,
      stroke: "#2e2e33", strokeOp: 1, sw: 1, gap: 16, pt: 24, pb: 24, pX: 16
    });

    const sbHeader = frame({name: "Header", dir: "HORIZONTAL", gap: 12, ai: "CENTER", pX: 4});
    const logoBlock = frame({name: "LogoBg", w: 32, h: 32, wFixed: true, hFixed: true, bg: "#6366f1", r: 8, bgOp: 0.15, jc:"CENTER", ai:"CENTER", dir:"HORIZONTAL"});
    logoBlock.appendChild(getIcon("briefcase", 18, "#6366f1"));
    sbHeader.appendChild(logoBlock);
    sbHeader.appendChild(txt("Vagas UX", 18, "Bold", "#ffffff"));
    SIDEBAR.appendChild(sbHeader);

    const sbNav = frame({name: "Navigation", dir: "VERTICAL", gap: 4, pt: 16});
    [
      {l: "Dashboard", i: "grid", a: true}, {l: "Meu Perfil", i: "user", a: false}, 
      {l: "Match", i: "heart", a: false}, {l: "Configurações", i: "settings", a: false}
    ].forEach(item => {
      const nItem = frame({
        name: item.l, dir: "HORIZONTAL", gap: 12, ai: "CENTER", 
        w: 192, h: 40, wFixed: true, hFixed: true, pX: 12, r: 8,
        bg: item.a ? "#6366f1" : undefined
      });
      nItem.appendChild(getIcon(item.i, 18, item.a ? "#ffffff" : "#a1a1aa"));
      nItem.appendChild(txt(item.l, 14, item.a ? "Semi Bold" : "Regular", item.a ? "#ffffff" : "#a1a1aa"));
      sbNav.appendChild(nItem);
    });
    SIDEBAR.appendChild(sbNav);
    ROOT.appendChild(SIDEBAR);

    // MAIN
    const MAIN = frame({
      name: "Main Content", dir: "VERTICAL", bg: "#0f0f12",
      w: 1216, h: 900, wFixed: true, hFixed: true, gap: 0
    });

    const HEADER = frame({
        name: "Header Toolbar", dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", sw: 1,
        w: 1216, hHug: true, wFixed: true
    });

    // Stats Row
    const STATS_ROW = frame({
        name: "Stats", dir: "HORIZONTAL", w: 1216, h: 68, wFixed: true, hFixed: true,
        gap: 12, pX: 16, pY: 12, stroke: "#2e2e33", sw: 1, ai: "CENTER"
    });
    const statsData = [
      { l: "Total", v: "114", c: "#22c55e", i: "briefcase" }, 
      { l: "Pendentes", v: "89", c: "#f59e0b", i: "clock" },
      { l: "Aplicadas", v: "3", c: "#6366f1", i: "check" }, 
      { l: "24h", v: "12", c: "#0ea5e9", i: "trending" }, 
      { l: "Destaques", v: "8", c: "#22c55e", i: "star" }
    ];
    statsData.forEach(s => {
        const scard = frame({
            name: s.l, dir: "HORIZONTAL", w: 226, h: 44, wFixed: true, hFixed: true,
            bg: "#1a1a1f", r: 8, stroke: "#2e2e33", pX: 12, jc: "SPACE_BETWEEN", ai:"CENTER"
        });
        const cl = frame({name:"Wrap", dir:"HORIZONTAL", gap:8, ai:"CENTER"});
        const icBg = frame({name:"bg", w:28, h:28, wFixed:true, hFixed:true, bg:s.c, bgOp:0.15, r:6, dir:"HORIZONTAL", jc:"CENTER", ai:"CENTER"});
        icBg.appendChild(getIcon(s.i, 14, s.c));
        cl.appendChild(icBg);
        cl.appendChild(txt(s.l, 12, "Regular", "#a1a1aa"));
        scard.appendChild(cl);
        scard.appendChild(txt(s.v, 18, "Bold", s.c));
        STATS_ROW.appendChild(scard);
    });
    HEADER.appendChild(STATS_ROW);

    // Toolbar Row
    const TOOLBAR_ROW = frame({
        name: "Filters & Search", dir: "HORIZONTAL", w: 1216, h: 52, wFixed: true, hFixed: true,
        gap: 12, pX: 16, ai: "CENTER", stroke: "#2e2e33", sw: 1
    });
    
    // Peridodo
    const tBtn1 = frame({name: "Periodo", dir:"HORIZONTAL", ai:"CENTER", gap:6, pX:12, h:28, hFixed:true, bg:"#252529", r:8});
    tBtn1.appendChild(getIcon("calendar", 14, "#a1a1aa"));
    tBtn1.appendChild(txt("Todo período", 12, "Regular", "#a1a1aa"));
    tBtn1.appendChild(getIcon("chevron", 14, "#a1a1aa"));
    TOOLBAR_ROW.appendChild(tBtn1);

    // Busca
    const searchInp = frame({name:"Busca", dir:"HORIZONTAL", ai:"CENTER", gap:8, pX:12, w: 340, wFixed:true, h:28, hFixed:true, bg:"#252529", r:8});
    searchInp.appendChild(getIcon("search", 14, "#71717a"));
    searchInp.appendChild(txt("Buscar vagas...", 12, "Regular", "#a1a1aa"));
    TOOLBAR_ROW.appendChild(searchInp);

    // Ordem
    const tBtn2 = frame({name: "Ordem", dir:"HORIZONTAL", ai:"CENTER", gap:6, pX:12, h:28, hFixed:true, bg:"#252529", r:8});
    tBtn2.appendChild(getIcon("sort", 14, "#a1a1aa"));
    tBtn2.appendChild(txt("Compatibilidade", 12, "Regular", "#a1a1aa"));
    tBtn2.appendChild(getIcon("chevron", 14, "#a1a1aa"));
    TOOLBAR_ROW.appendChild(tBtn2);

    HEADER.appendChild(TOOLBAR_ROW);

    // Tabs Row
    const TABS_ROW = frame({
        name: "Tabs Row", dir: "HORIZONTAL", w: 1216, h: 44, wFixed: true, hFixed: true,
        gap: 16, pX: 16, pt: 8, ai: "CENTER", jc: "SPACE_BETWEEN"
    });
    const tabsLeft = frame({name: "Left", dir:"HORIZONTAL", gap:16, ai:"CENTER"});
    
    const tFl = frame({name: "FilterBtn", dir:"HORIZONTAL", ai:"CENTER", gap:6, pX:12, h:28, hFixed:true, bg:"#6366f1", bgOp:0.1, r:8});
    tFl.appendChild(getIcon("filter", 14, "#6366f1"));
    tFl.appendChild(txt("Filtros", 14, "Medium", "#6366f1"));
    tabsLeft.appendChild(tFl);
    tabsLeft.appendChild(frame({name:"Divisão", w:1, h:20, wFixed:true, hFixed:true, bg:"#2e2e33"}));

    const tabsListWrapper = frame({name: "Lista", dir:"HORIZONTAL"});
    const tabsList = [
        {l: "Todas", v: "114", a: true}, {l: "Favoritos", v: "0", a: false}, {l: "Destaques", v: "0", a: false}, 
        {l: "Indeed", v: "36", a: false}, {l: "LinkedIn", v: "34", a: false}, {l: "Posts", v: "44", a: false}
    ];
    tabsList.forEach(t => {
        const tw = frame({name: t.l, dir: "VERTICAL", ai: "CENTER", jc: "SPACE_BETWEEN", h: 36, hFixed:true});
        const tt = frame({name: "Row", dir:"HORIZONTAL", gap:6, pX:12, pt:4, ai:"CENTER"});
        tt.appendChild(txt(t.l, 14, t.a ? "Medium" : "Regular", t.a ? "#ffffff" : "#a1a1aa"));
        tt.appendChild(txt(t.v, 11, "Regular", t.a ? "#a1a1aa" : "#71717a"));
        tw.appendChild(tt);
        tw.appendChild(frame({name:"Indicator", h:2, hFixed:true, w:20, wFixed:true, bg:"#6366f1", bgOp: t.a ? 1 : 0}));
        tabsListWrapper.appendChild(tw);
    });
    tabsLeft.appendChild(tabsListWrapper);
    TABS_ROW.appendChild(tabsLeft);

    HEADER.appendChild(TABS_ROW);
    MAIN.appendChild(HEADER);

    // --- Content SCROLL AREA ---
    const CONTENT = frame({
        name: "Main Body", dir: "HORIZONTAL", bg: "#0f0f12", 
        w: 1216, h: 736, wFixed: true, hFixed: true, pAll: 16, gap: 16
    });

    const FILTERS_SIDEBAR = frame({
        name: "Sidebar Filtros", dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", sw: 1, r: 12,
        w: 224, h: 704, wFixed: true, hFixed: true, gap: 24, pAll: 16
    });

    ["Nível", "Modalidade", "Status"].forEach(fGrp => {
        const grp = frame({name: fGrp, dir: "VERTICAL", gap: 12, w: 192, wFixed:true});
        grp.appendChild(txt(fGrp, 14, "Semi Bold", "#ffffff"));
        [1,2,3].forEach(i => {
           const row = frame({name: "Row", dir: "HORIZONTAL", ai: "CENTER", gap: 12});
           row.appendChild(frame({name: "cbx", w: 16, h: 16, wFixed:true, hFixed:true, r: 4, bg: "#252529", stroke: "#2e2e33", sw:1}));
           row.appendChild(txt(fGrp === "Status" ? `Status ${i}` : `Opção ${i}`, 12, "Regular", "#a1a1aa"));
           grp.appendChild(row);
        });
        FILTERS_SIDEBAR.appendChild(grp);
    });
    CONTENT.appendChild(FILTERS_SIDEBAR);

    const GRID_WRAP = frame({
        name: "Grid Wrap", dir: "HORIZONTAL", wrap: true, gap: 16, w: 944, wFixed: true, hHug: true
    });

    const cardsData = [
      {title: "Product Designer Sênior — Design System", score: 92, source: "LinkedIn", e: "Neon"},
      {title: "UX Designer Pleno — Growth & Experimentation", score: 85, source: "Indeed", e: "Nubank"},
      {title: "UX Lead — Seller Experience & Onboarding", score: 78, source: "Posts", e: "Mercado Livre"},
      {title: "Product Designer — Mobile & Consumer Apps", score: 74, source: "LinkedIn", e: "Itaú"},
      {title: "UX/UI Designer — Plataforma B2B SaaS", score: 71, source: "Indeed", e: "TOTVS"},
      {title: "Senior UX Designer — Fintech Products", score: 68, source: "Posts", e: "Creditas"}
    ];

    cardsData.forEach((cd, i) => {
        // Agora com HUG hMode e WFixed, assim o texto cresce para baixo e empurra o cartão!
        const cardBox = frame({
            name: `Card ${i}`, dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", sw: 1, r: 16,
            w: 304, wFixed: true, hHug: true, pAll: 16, gap: 16
        });

        // H1 header
        const cardH1 = frame({name: "Header", dir: "HORIZONTAL", jc: "SPACE_BETWEEN", ai: "CENTER", wFill:true});
        cardH1.layoutAlign = "STRETCH";

        const badgeWrap = frame({name: "Badges", dir: "HORIZONTAL", gap: 8, ai: "CENTER"});
        const srcBadge = frame({name: "Fonte", dir:"HORIZONTAL", ai:"CENTER", jc:"CENTER", pX: 8, pY: 4, bg: "#252529", stroke: "#2e2e33", sw: 1, r: 12});
        srcBadge.appendChild(txt(cd.source, 10, "Regular", "#a1a1aa"));
        badgeWrap.appendChild(srcBadge);

        const scoreBadge = frame({name: "Match", dir:"HORIZONTAL", ai:"CENTER", jc:"CENTER", gap: 4, pX: 8, pY: 4, bg: "#22c55e", bgOp: 0.15, r: 12});
        scoreBadge.appendChild(getIcon("star", 10, "#22c55e"));
        scoreBadge.appendChild(txt(`${cd.score}% Match`, 10, "Semi Bold", "#22c55e"));
        badgeWrap.appendChild(scoreBadge);
        cardH1.appendChild(badgeWrap);
        
        const favIcon = frame({name: "Fav", w:28, h:28, wFixed:true, hFixed:true, bg: "#252529", r:8, jc:"CENTER", ai:"CENTER", dir:"HORIZONTAL"}); 
        favIcon.appendChild(getIcon("heart", 14, "#a1a1aa"));
        cardH1.appendChild(favIcon);
        
        cardBox.appendChild(cardH1);

        // Titles (Now supporting wrapping!)
        const tWrap = frame({name: "TitleBlock", dir: "VERTICAL", gap: 4});
        tWrap.layoutAlign = "STRETCH";
        
        // Magica do Wrap do Figma!
        tWrap.appendChild(txt(cd.title, 14, "Bold", "#ffffff", {wFill: true}));
        tWrap.appendChild(txt(cd.e, 12, "Regular", "#a1a1aa", {wFill: true}));
        cardBox.appendChild(tWrap);

        // Tags
        const tagsWrp = frame({name: "Tags", dir: "HORIZONTAL", gap: 6, wrap: true});
        tagsWrp.layoutAlign = "STRETCH";
        ["Remoto", "Sênior", "R$ 15k-20k"].forEach(tgS => {
           const tgB = frame({name: "Tag", dir:"HORIZONTAL", ai:"CENTER", jc:"CENTER", pX: 8, pY: 4, bg: "#252529", r: 12});
           tgB.appendChild(txt(tgS, 10, "Regular", "#a1a1aa"));
           tagsWrp.appendChild(tgB);
        });
        cardBox.appendChild(tagsWrp);

        // Botões
        const btnRow = frame({name: "Footer Actions", dir: "HORIZONTAL", gap: 8, ai: "CENTER", pt: 16});
        btnRow.layoutAlign = "STRETCH";
        
        const mBtn1 = frame({
            name: "WhatsApp", dir: "HORIZONTAL", ai: "CENTER", jc: "CENTER", gap: 6, pY: 8, r: 8, stroke: "#25D366", sw: 1
        });
        mBtn1.layoutGrow = 1; // Flex-1 / w-full
        mBtn1.appendChild(getIcon("whatsapp", 14, "#25D366")); 
        mBtn1.appendChild(txt("WhatsApp", 12, "Medium", "#25D366"));
        btnRow.appendChild(mBtn1);

        const aiBtn = frame({
            name: "AI Pitch", dir: "HORIZONTAL", ai: "CENTER", jc: "CENTER", w: 34, h: 34, wFixed: true, hFixed: true, r: 8,
            bg: "#a855f7", bgOp: 0.1, stroke: "#a855f7", strokeOp: 0.3, sw: 1
        });
        aiBtn.appendChild(getIcon("zap", 16, "#a855f7"));
        btnRow.appendChild(aiBtn);

        cardBox.appendChild(btnRow);
        GRID_WRAP.appendChild(cardBox);
    });

    CONTENT.appendChild(GRID_WRAP);
    MAIN.appendChild(CONTENT);

    ROOT.appendChild(MAIN);
    pg.appendChild(ROOT);
    figma.viewport.scrollAndZoomIntoView([ROOT]);

    console.log("✅ Dashboard v4 C/ Icones e Wrap injetado!");
    figma.notify("✅ Dashboard Vagas UX 1:1 RECRIADO com Sucesso (v4)", {timeout: 3000, error: false});

  } catch(err) {
    console.error("❌ Erro Completo:", err);
    figma.notify("❌ Erro: " + err.message, {timeout: 5000, error: true});
  }
})();
"""

def inject():
    try:
        payload = json.dumps({"code": JS_CODE}).encode()
        req = urllib.request.Request(FIGMA_BRIDGE_URL, data=payload, headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r:
            print("✅ Pixel Perfect v4 (Ícones e Wrap) enviado para o Figma!")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if inject() else 1)
