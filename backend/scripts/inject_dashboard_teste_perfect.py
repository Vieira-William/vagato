#!/usr/bin/env python3
"""
Dashboard 1:1 FINAL - Pixel Perfect for 'teste' page
Uses exact Figma Flexbox to AutoLayout mapping
"""

import json
import urllib.request
import sys

FIGMA_BRIDGE_URL = "http://localhost:9999/execute"

JS_CODE = r"""
(async () => {
  try {
    await figma.loadFontAsync({family:"Inter",style:"Regular"});
    await figma.loadFontAsync({family:"Inter",style:"Medium"});
    await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});
    await figma.loadFontAsync({family:"Inter",style:"Bold"});

    const rgb = h => { 
      const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); 
      return r?{r:parseInt(r[1],16)/255,g:parseInt(r[2],16)/255,b:parseInt(r[3],16)/255}:{r:0,g:0,b:0}; 
    };
    const fill = (h,op=1) => [{type:"SOLID",color:rgb(h),opacity:op}];
    const none = () => [];

    function createBox({
        name = "Frame",
        width, height,
        wMode, hMode, // "FIXED", "HUG", "FILL"
        direction = "NONE", // "HORIZONTAL", "VERTICAL", "NONE"
        alignItems = "MIN", // "MIN", "CENTER", "MAX", "SPACE_BETWEEN"
        justifyContent = "MIN", // "MIN", "CENTER", "MAX", "SPACE_BETWEEN"
        gap = 0,
        pAll, pX, pY, pt, pr, pb, pl,
        fillHex, fillAlpha = 1,
        strokeHex, strokeAlpha = 1, strokeWt = 0, strokeAlign = "INSIDE",
        radiusAll, tl, tr, br, bl,
        shadow, // { color, x, y, radius, spread }
        clip = false,
        wrap = false // "WRAP" ou "NO_WRAP"
    }) {
        const frame = figma.createFrame();
        frame.name = name;
        frame.clipsContent = clip;
        
        if (direction !== "NONE") {
            frame.layoutMode = direction;
            frame.primaryAxisAlignItems = justifyContent;
            frame.counterAxisAlignItems = alignItems;
            frame.itemSpacing = gap;
            
            frame.layoutSizingHorizontal = wMode === "HUG" ? "HUG" : (wMode === "FILL" ? "FILL" : "FIXED");
            frame.layoutSizingVertical = hMode === "HUG" ? "HUG" : (hMode === "FILL" ? "FILL" : "FIXED");
            if (wrap) frame.layoutWrap = "WRAP";
        } else {
            frame.layoutMode = "NONE";
        }
        
        if (width !== undefined && (!wMode || wMode === "FIXED")) frame.resize(width, frame.height);
        if (height !== undefined && (!hMode || hMode === "FIXED")) frame.resize(frame.width, height);

        if (pAll !== undefined) {
            frame.paddingTop = pAll; frame.paddingRight = pAll; frame.paddingBottom = pAll; frame.paddingLeft = pAll;
        } else {
            if (pX !== undefined) { frame.paddingLeft = pX; frame.paddingRight = pX; }
            if (pY !== undefined) { frame.paddingTop = pY; frame.paddingBottom = pY; }
            if (pt !== undefined) frame.paddingTop = pt;
            if (pr !== undefined) frame.paddingRight = pr;
            if (pb !== undefined) frame.paddingBottom = pb;
            if (pl !== undefined) frame.paddingLeft = pl;
        }
        
        if (fillHex) frame.fills = fill(fillHex, fillAlpha);
        else frame.fills = [];
        
        if (strokeHex) {
            frame.strokes = fill(strokeHex, strokeAlpha);
            frame.strokeWeight = strokeWt || 1;
            frame.strokeAlign = strokeAlign;
        }
        
        if (radiusAll !== undefined) frame.cornerRadius = radiusAll;
        else {
            if (tl !== undefined) frame.topLeftRadius = tl;
            if (tr !== undefined) frame.topRightRadius = tr;
            if (br !== undefined) frame.bottomRightRadius = br;
            if (bl !== undefined) frame.bottomLeftRadius = bl;
        }
        
        if (shadow) {
            frame.effects = [{
                type: "DROP_SHADOW",
                color: {r: shadow.color.r, g: shadow.color.g, b: shadow.color.b, a: shadow.color.a},
                offset: { x: shadow.x, y: shadow.y },
                radius: shadow.radius,
                spread: shadow.spread || 0,
                visible: true,
                blendMode: "NORMAL"
            }];
        }
        return frame;
    }

    function createText({
        text = "", size = 14, weight = "Regular", family = "Inter",
        fillHex = "#ffffff", fillAlpha = 1,
        align = "LEFT", // "LEFT", "CENTER", "RIGHT"
        wMode="HUG", hMode="HUG"
    }) {
        const t = figma.createText();
        t.fontName = { family: family, style: weight };
        t.characters = String(text);
        t.fontSize = size;
        t.fills = fill(fillHex, fillAlpha);
        t.textAlignHorizontal = align;
        t.layoutSizingHorizontal = wMode === "FILL" ? "FILL" : (wMode === "FIXED" ? "FIXED" : "HUG");
        t.layoutSizingVertical = hMode === "FILL" ? "FILL" : (hMode === "FIXED" ? "FIXED" : "HUG");
        return t;
    }

    function createIconPlace(size, color, alpha=1) {
        return createBox({
            name: "Icon", wMode: "FIXED", hMode: "FIXED", width: size, height: size, fillHex: color, fillAlpha: alpha, radiusAll: Math.floor(size/4)
        });
    }

    // 1. Criar e limpar a página 'teste'
    let pg = figma.root.children.find(n => n.name.toLowerCase() === "teste");
    if(!pg) { pg = figma.createPage(); pg.name = "teste"; }
    figma.currentPage = pg;
    pg.children.forEach(n => n.remove());

    // 2. ROOT da Tela
    const SCREEN = createBox({
        name: "Dashboard (Pixel Perfect)", width: 1440, height: 900,
        wMode: "FIXED", hMode: "FIXED", direction: "HORIZONTAL", fillHex: "#0f0f12", clip: true
    });
    
    // ==========================================
    // SIDEBAR
    // h-full border-r border-[#2e2e33] bg-[#1a1a1f] w-56
    // ==========================================
    const SIDEBAR = createBox({
        name: "Sidebar", width: 224, wMode: "FIXED", hMode: "FILL", direction: "VERTICAL",
        fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1
    });
    
    // Header Sidebar: h-16 flex items-center px-3 border-b
    const SIDEBAR_HEADER = createBox({
        name: "Header", height: 64, wMode: "FILL", hMode: "FIXED", direction: "HORIZONTAL", alignItems: "CENTER", pX: 12, gap: 12,
        strokeHex: "#2e2e33", strokeWt: 1
    });
    SIDEBAR_HEADER.appendChild(createIconPlace(32, "#6366f1")); // Logo bg
    SIDEBAR_HEADER.appendChild(createText({text: "Vagas UX", size: 16, weight: "Bold"}));
    SIDEBAR.appendChild(SIDEBAR_HEADER);
    
    // Nav Items: py-4 px-2 space-y-1
    const SIDEBAR_NAV = createBox({
        name: "Navigation", wMode: "FILL", hMode: "FILL", direction: "VERTICAL", pY: 16, pX: 8, gap: 4
    });
    const navItems = [
        { label: "Dashboard", active: true }, { label: "Meu Perfil", active: false },
        { label: "Match", active: false }, { label: "Configurações", active: false }
    ];
    navItems.forEach(item => {
        const navItem = createBox({
            name: `Nav Item: ${item.label}`, wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", pX: 12, pY: 10, gap: 12, radiusAll: 8,
            fillHex: item.active ? "#6366f1" : null
        });
        navItem.appendChild(createIconPlace(20, item.active ? "#ffffff" : "#a1a1aa"));
        navItem.appendChild(createText({
            text: item.label, size: 14, weight: item.active ? "Semi Bold" : "Regular", fillHex: item.active ? "#ffffff" : "#a1a1aa", wMode: "FILL"
        }));
        SIDEBAR_NAV.appendChild(navItem);
    });
    SIDEBAR.appendChild(SIDEBAR_NAV);

    // Sidebar Bottom: p-2 border-t
    const SIDEBAR_BOT = createBox({
        name: "Bottom", wMode: "FILL", hMode: "HUG", direction: "VERTICAL", pAll: 8, strokeHex: "#2e2e33", strokeWt: 1
    });
    const themeBtn = createBox({
        name: "Theme Toggle", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", pX: 12, pY: 10, gap: 12, radiusAll: 8
    });
    themeBtn.appendChild(createIconPlace(20, "#a1a1aa"));
    themeBtn.appendChild(createText({text: "Light Mode", size: 14, weight: "Regular", fillHex: "#a1a1aa", wMode: "FILL"}));
    SIDEBAR_BOT.appendChild(themeBtn);
    SIDEBAR.appendChild(SIDEBAR_BOT);

    // ==========================================
    // MAIN CONTENT
    // flex-1 bg-[--bg-primary] flex flex-col
    // ==========================================
    const MAIN = createBox({
        name: "Main App Area", wMode: "FILL", hMode: "FILL", direction: "VERTICAL", fillHex: "#0f0f12"
    });

    // --- MAIN HEADER ---
    const MAIN_HEADER = createBox({
        name: "Main Header", wMode: "FILL", hMode: "HUG", direction: "VERTICAL", fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1
    });

    // 1. Stats Row: flex gap-3 px-4 py-3 border-b
    const STATS_ROW = createBox({
        name: "Stats Row", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", gap: 12, pX: 16, pY: 12, strokeHex: "#2e2e33", strokeWt: 1
    });
    const stats = [
        { t: "Total", v: "114", col: "#6366f1" }, { t: "Pendentes", v: "89", col: "#f59e0b" },
        { t: "Aplicadas", v: "3", col: "#22c55e" }, { t: "24h", v: "12", col: "#06b6d4" }, { t: "Destaques", v: "8", col: "#22c55e" }
    ];
    stats.forEach(s => {
        const scard = createBox({
            name: `Stat: ${s.t}`, wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", justifyContent: "SPACE_BETWEEN", alignItems: "CENTER", gap: 8,
            fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1, radiusAll: 12, pX: 12, pY: 10
        });
        const leftWrap = createBox({ name: "Left", wMode: "HUG", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", gap: 10});
        leftWrap.appendChild(createIconPlace(24, s.col, 0.15));
        leftWrap.appendChild(createText({text: s.t, size: 12, fillHex: "#a1a1aa"}));
        scard.appendChild(leftWrap);
        scard.appendChild(createText({text: s.v, size: 20, weight: "Bold", fillHex: s.col}));
        STATS_ROW.appendChild(scard);
    });
    MAIN_HEADER.appendChild(STATS_ROW);

    // 2. Toolbar Row: px-4 py-2 flex items-center gap-3 border-b
    const TOOLBAR_ROW = createBox({
        name: "Toolbar Settings", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", gap: 12, pX: 16, pY: 12, strokeHex: "#2e2e33", strokeWt: 1
    });
    
    // Period Dropdown
    const tBtn1 = createBox({name: "Periodo", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 8, fillHex: "#252529", radiusAll: 8});
    tBtn1.appendChild(createIconPlace(14, "#a1a1aa"));
    tBtn1.appendChild(createText({text:"Todo período", size: 12, fillHex: "#a1a1aa"}));
    tBtn1.appendChild(createIconPlace(14, "#a1a1aa")); // chevron down mock
    TOOLBAR_ROW.appendChild(tBtn1);

    // Search bar (flex-1 max-w-md bg-tertiary border rounded-lg) -> map `wMode: FILL` with width 400
    const searchBar = createBox({
        name: "Search Input", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 8, fillHex: "#252529", radiusAll: 8
    });
    searchBar.appendChild(createIconPlace(14, "#a1a1aa"));
    searchBar.appendChild(createText({text:"Buscar vagas...", size: 12, fillHex: "#a1a1aa"}));
    TOOLBAR_ROW.appendChild(searchBar);

    // Ordenacao
    const tBtn2 = createBox({name: "Ordenacao", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 8, fillHex: "#252529", radiusAll: 8});
    tBtn2.appendChild(createIconPlace(14, "#a1a1aa"));
    tBtn2.appendChild(createText({text:"Compatibilidade", size: 12, fillHex: "#a1a1aa"}));
    tBtn2.appendChild(createIconPlace(14, "#a1a1aa"));
    TOOLBAR_ROW.appendChild(tBtn2);
    
    // Push Right Spacer
    TOOLBAR_ROW.appendChild(createBox({name: "Spacer", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL"}));

    // Mode Toggle
    const toggleBox = createBox({name: "Mode Toggle", direction: "HORIZONTAL", alignItems: "CENTER", gap: 4, pAll: 4, fillHex: "#252529", radiusAll: 8});
    toggleBox.appendChild(createBox({name: "Grid Active", wMode: "FIXED", hMode: "FIXED", width: 28, height: 28, fillHex: "#1a1a1f", radiusAll: 6, shadow: {color: {r:0,g:0,b:0,a:0.2}, x:0, y:2, radius:4}}));
    toggleBox.appendChild(createBox({name: "List Inactive", wMode: "FIXED", hMode: "FIXED", width: 28, height: 28, fillHex: "#252529", radiusAll: 6}));
    TOOLBAR_ROW.appendChild(toggleBox);

    // Button Group
    const btnGroup = createBox({name: "Refresh Group", direction: "HORIZONTAL", wMode: "HUG", hMode: "HUG"});
    const btnRefresh = createBox({name: "Refresh", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 16, pY: 8, fillHex: "#6366f1", tl: 8, bl: 8, tr: 0, br: 0});
    btnRefresh.appendChild(createIconPlace(14, "#ffffff"));
    btnRefresh.appendChild(createText({text:"Atualizar Vagas", size: 12, weight: "Medium", fillHex: "#ffffff"}));
    btnGroup.appendChild(btnRefresh);
    btnGroup.appendChild(createBox({name: "Divider", width: 1, wMode: "FIXED", hMode: "FILL", fillHex: "#ffffff", fillAlpha: 0.2}));
    const btnTimer = createBox({name: "Timer", direction: "HORIZONTAL", alignItems: "CENTER", pX: 10, pY: 8, fillHex: "#6366f1", tl: 0, bl: 0, tr: 8, br: 8});
    btnTimer.appendChild(createIconPlace(14, "#ffffff"));
    btnGroup.appendChild(btnTimer);
    TOOLBAR_ROW.appendChild(btnGroup);

    MAIN_HEADER.appendChild(TOOLBAR_ROW);

    // 3. Tabs & Filters: px-4 flex justify-between
    const TABS_ROW = createBox({
        name: "Tabs Row", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", justifyContent: "SPACE_BETWEEN", alignItems: "CENTER", pX: 16, pt: 8
    });
    
    const tabsWrapLeft = createBox({name: "Left Tabs", direction: "HORIZONTAL", alignItems: "CENTER", gap: 16, wMode: "HUG", hMode: "HUG"});
    const filtersBtn = createBox({name: "Filter Sidebar Toggle", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 6, fillHex: "#6366f1", fillAlpha: 0.1, radiusAll: 8});
    filtersBtn.appendChild(createIconPlace(16, "#6366f1"));
    filtersBtn.appendChild(createText({text: "Filtros", size: 14, weight: "Medium", fillHex: "#6366f1"}));
    tabsWrapLeft.appendChild(filtersBtn);
    
    tabsWrapLeft.appendChild(createBox({name: "Divider", width: 1, height: 20, wMode:"FIXED", hMode:"FIXED", fillHex: "#2e2e33"}));

    const tList = [{l: "Todas", v:"114", a:true}, {l: "Favoritos", v:"0"}, {l: "Destaques", v:"0"}, {l: "Indeed", v:"36"}, {l: "LinkedIn", v:"34"}, {l: "Posts", v:"44"}];
    const tabsListCont = createBox({name: "Tabs Text", direction: "HORIZONTAL", wMode: "HUG", hMode: "HUG"});
    tList.forEach(t => {
        const tb = createBox({name: t.l, direction: "VERTICAL", gap: 8, wMode: "HUG", hMode: "HUG"}); // Bottom border line approach
        const tlInner = createBox({name: "Inner", direction: "HORIZONTAL", gap: 6, pX: 16, pt: 8, pb: 6, wMode: "HUG", hMode: "HUG", alignItems: "CENTER"});
        tlInner.appendChild(createText({text: t.l, size: 14, weight: t.a ? "Medium" : "Regular", fillHex: t.a ? "#ffffff" : "#a1a1aa"}));
        tlInner.appendChild(createText({text: t.v, size: 12, fillHex: t.a ? "#a1a1aa" : "#71717a"}));
        tb.appendChild(tlInner);
        
        if (t.a) tb.appendChild(createBox({name: "Active Line", width: 10, height: 2, wMode:"FILL", hMode:"FIXED", fillHex:"#6366f1"}));
        else tb.appendChild(createBox({name: "Invisible Line", width: 10, height: 2, wMode:"FILL", hMode:"FIXED", fillHex:"#6366f1", fillAlpha: 0}));

        tabsListCont.appendChild(tb);
    });
    tabsWrapLeft.appendChild(tabsListCont);
    TABS_ROW.appendChild(tabsWrapLeft);

    const pagBox = createBox({name: "Pagination", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, wMode: "HUG", hMode: "HUG", pb: 8});
    [1,2].forEach(i => pagBox.appendChild(createIconPlace(20, "#252529")));
    pagBox.appendChild(createText({text:"1 / 10", size: 12, fillHex:"#a1a1aa"}));
    [1,2].forEach(i => pagBox.appendChild(createIconPlace(20, "#252529")));
    TABS_ROW.appendChild(pagBox);

    MAIN_HEADER.appendChild(TABS_ROW);
    MAIN.appendChild(MAIN_HEADER);

    // --- CONTENT AREA (Filtros Sidebar + Cards Grid) ---
    const APP_CONTENT = createBox({
        name: "Content Splitter", wMode: "FILL", hMode: "FILL", direction: "HORIZONTAL"
    });

    // 1. Filtros Sidebar (w-56)
    const APP_SIDEBAR = createBox({
        name: "Filtros Sidebar", width: 224, wMode: "FIXED", hMode: "FILL", direction: "VERTICAL", pAll: 16, gap: 24, fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1
    });

    ["Nível", "Modalidade", "Status"].forEach(fGrp => {
        const grp = createBox({name: fGrp, wMode: "FILL", hMode: "HUG", direction: "VERTICAL", gap: 12});
        grp.appendChild(createText({text: fGrp, size: 14, weight: "Semi Bold", fillHex: "#ffffff"}));
        [1,2,3].forEach(i => {
           const row = createBox({name: "Row", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", gap: 12});
           row.appendChild(createBox({name: "cbx", wMode:"FIXED", hMode:"FIXED", width: 16, height: 16, radiusAll: 4, fillHex: "#252529", strokeHex: "#2e2e33", strokeWt:1}));
           row.appendChild(createText({text: fGrp === "Status" ? `Status ${i}` : `Opção ${i}`, size: 12, fillHex: "#a1a1aa", wMode: "FILL"}));
           grp.appendChild(row);
        });
        APP_SIDEBAR.appendChild(grp);
    });
    APP_CONTENT.appendChild(APP_SIDEBAR);

    // 2. Cards Grid Area (flex-1 p-4)
    // Usando Wrap no AutoLayout para formar um CSS Grid like com as rows fluidas.
    const SCROLL_CARDS = createBox({
        name: "List of Vagas", wMode: "FILL", hMode: "FILL", direction: "VERTICAL", pAll: 16
    });

    const CARDS_WRAP = createBox({
        name: "Grid Wrap", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", gap: 12, wrap: true
    });

    const cardsData = [
      {title: "Product Designer Sênior — Design System", score: 92, source: "LinkedIn", emp: "Neon"},
      {title: "UX Designer Pleno — Growth & Experimentation", score: 85, source: "Indeed", emp: "Nubank"},
      {title: "UX Lead — Seller Experience & Onboarding", score: 78, source: "Posts", emp: "Mercado Livre"},
      {title: "Product Designer — Mobile & Consumer Apps", score: 74, source: "LinkedIn", emp: "Itaú"},
      {title: "UX/UI Designer — Plataforma B2B SaaS", score: 71, source: "Indeed", emp: "TOTVS"},
      {title: "Senior UX Designer — Fintech Products", score: 68, source: "Posts", emp: "Creditas"}
    ];

    cardsData.forEach((cd, i) => {
        // VagaCard: min-w-[300] max-w-[400] -> For Figma flex wrap we use relative fixed widths or FILL.
        // Let's use FIXED width 314px (fits exactly 3 per row in 1440 - 224 - 224 - paddings).
        const cardBox = createBox({
            name: `Card ${i}`, width: 312, wMode: "FIXED", hMode: "HUG", direction: "VERTICAL", pAll: 20, gap: 16,
            fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1, radiusAll: 16,
            shadow: { color: {r:0,g:0,b:0,a:0.1}, x: 0, y: 4, radius: 12 }
        });

        // H1 header
        const cardH1 = createBox({name: "Header Line", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", justifyContent: "SPACE_BETWEEN", alignItems: "CENTER"});
        const badgeWrap = createBox({name: "Badges", direction: "HORIZONTAL", gap: 8, wMode: "HUG", hMode: "HUG", alignItems: "CENTER"});
        
        const srcBadge = createBox({name: "Fonte", pX: 8, pY: 4, fillHex: "#252529", strokeHex: "#2e2e33", strokeWt: 1, radiusAll: 12, alignItems:"CENTER", justifyContent:"CENTER"});
        srcBadge.appendChild(createText({text: cd.source, size: 10, fillHex: "#a1a1aa"}));
        badgeWrap.appendChild(srcBadge);

        const scoreBadge = createBox({name: "Match", pX: 8, pY: 4, fillHex: "#22c55e", fillAlpha: 0.15, radiusAll: 12, alignItems:"CENTER", justifyContent:"CENTER"});
        scoreBadge.appendChild(createText({text: `${cd.score}% Match`, size: 10, weight: "Semi Bold", fillHex: "#22c55e"}));
        badgeWrap.appendChild(scoreBadge);
        cardH1.appendChild(badgeWrap);
        
        const actsWrap = createBox({name: "Fav", direction: "HORIZONTAL", gap: 8, wMode: "HUG", hMode: "HUG"});
        actsWrap.appendChild(createIconPlace(28, "#252529")); 
        cardH1.appendChild(actsWrap);
        
        cardBox.appendChild(cardH1);

        // Content (Title)
        const tWrap = createBox({name: "TitleBlock", direction: "VERTICAL", gap: 4, wMode: "FILL", hMode: "HUG"});
        const txT = createText({text: cd.title, size: 16, weight: "Bold", wMode: "FILL"});
        tWrap.appendChild(txT);
        tWrap.appendChild(createText({text: cd.emp, size: 12, fillHex: "#a1a1aa", wMode: "FILL"}));
        cardBox.appendChild(tWrap);

        // Tags
        const tagsWrp = createBox({name: "Tags", direction: "HORIZONTAL", gap: 6, wMode: "FILL", hMode: "HUG", wrap: true});
        ["Remoto", "Sênior", "R$ 15k-20k"].forEach(tgS => {
           const tgB = createBox({name: "Tag", pX: 8, pY: 4, fillHex: "#252529", radiusAll: 12});
           tgB.appendChild(createText({text: tgS, size: 10, fillHex: "#a1a1aa"}));
           tagsWrp.appendChild(tgB);
        });
        cardBox.appendChild(tagsWrp);

        // Botões (aplicar / zap)
        const btnRow = createBox({name: "Footer Actions", direction: "HORIZONTAL", gap: 8, wMode: "FILL", hMode: "HUG", pt: 8});
        const mBtn1 = createBox({
            name: "PrimaryAction", direction: "HORIZONTAL", wMode: "FILL", hMode: "HUG", justifyContent: "CENTER", pY: 8, 
            strokeHex: "#25D366", strokeWt: 1, radiusAll: 8, alignItems: "CENTER", gap: 6
        });
        mBtn1.appendChild(createIconPlace(14, "#25D366")); // icone fake zap
        mBtn1.appendChild(createText({text: "WhatsApp", size: 12, weight: "Medium", fillHex: "#25D366"}));
        btnRow.appendChild(mBtn1);

        const aiBtn = createBox({
            name: "AI Pitch", wMode: "FIXED", hMode: "FIXED", width: 34, height: 34, radiusAll: 8,
            fillHex: "#a855f7", fillAlpha: 0.1, strokeHex: "#a855f7", strokeAlpha: 0.3, strokeWt: 1,
            direction: "HORIZONTAL", justifyContent: "CENTER", alignItems: "CENTER"
        });
        aiBtn.appendChild(createIconPlace(14, "#a855f7"));
        btnRow.appendChild(aiBtn);

        cardBox.appendChild(btnRow);

        CARDS_WRAP.appendChild(cardBox);
    });

    SCROLL_CARDS.appendChild(CARDS_WRAP);
    APP_CONTENT.appendChild(SCROLL_CARDS);

    MAIN.appendChild(APP_CONTENT);

    SCREEN.appendChild(SIDEBAR);
    SCREEN.appendChild(MAIN);
    pg.appendChild(SCREEN);

    figma.viewport.scrollAndZoomIntoView([SCREEN]);

    console.log("✅ Dashboard 1:1 FINAL (Pixel-Perfect Wrapper) injetado na nova pagina teste!");

  } catch(err) {
    console.error("❌ Erro:", err.message);
  }
})();
"""

def inject():
    try:
        payload = json.dumps({"code": JS_CODE}).encode()
        req = urllib.request.Request(FIGMA_BRIDGE_URL, data=payload, headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r:
            print("✅ Pixel Perfect enviado para o Figma!")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if inject() else 1)
