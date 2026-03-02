#!/usr/bin/env python3
"""
Dashboard 1:1 FINAL v2 - Pixel Perfect for 'teste' page
Uses exact Figma Flexbox to AutoLayout mapping with robust font loading and sizing.
"""

import json
import urllib.request
import sys

FIGMA_BRIDGE_URL = "http://localhost:9999/execute"

JS_CODE = r"""
(async () => {
  try {
    // 1. CARREGAMENTO ROBUSTO DE FONTES (Inter style names: Regular, Medium, SemiBold, Bold)
    const loadFont = async (style) => {
        try { await figma.loadFontAsync({family:"Inter", style}); } 
        catch(e) { console.warn("Font load failed:", style, e); }
    };
    await loadFont("Regular");
    await loadFont("Medium");
    await loadFont("SemiBold");
    await loadFont("Bold");

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
        
        let finalWMode = wMode || "FIXED";
        let finalHMode = hMode || "FIXED";

        if (direction !== "NONE") {
            frame.layoutMode = direction;
            frame.primaryAxisAlignItems = justifyContent;
            frame.counterAxisAlignItems = alignItems;
            frame.itemSpacing = gap;
            
            frame.primaryAxisSizingMode = (direction === "HORIZONTAL" && finalWMode === "HUG") || (direction === "VERTICAL" && finalHMode === "HUG") ? "AUTO" : "FIXED";
            frame.counterAxisSizingMode = (direction === "HORIZONTAL" && finalHMode === "HUG") || (direction === "VERTICAL" && finalWMode === "HUG") ? "AUTO" : "FIXED";
            
            if (wrap) frame.layoutWrap = "WRAP";
        } else {
            frame.layoutMode = "NONE";
        }
        
        // Configurações para quando ESTE nó é filho de um AutoLayout e precisa dar FILL
        // Para garantir que funcione, usamos a propriedade abstrata node.layoutPositioning
        // No entanto o Figma API usa layoutGrow e layoutAlign. Vamos acoplar depois no appendChildCustom
        frame.setPluginData("wMode", finalWMode);
        frame.setPluginData("hMode", finalHMode);

        if (width !== undefined && finalWMode === "FIXED") frame.resize(width, frame.height);
        if (height !== undefined && finalHMode === "FIXED") frame.resize(frame.width, height);

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
        t.setPluginData("wMode", wMode);
        t.setPluginData("hMode", hMode);
        return t;
    }

    function createIconPlace(size, color, alpha=1) {
        return createBox({
            name: "Icon", wMode: "FIXED", hMode: "FIXED", width: size, height: size, fillHex: color, fillAlpha: alpha, radiusAll: Math.floor(size/4)
        });
    }

    function appendNode(parent, child) {
        parent.appendChild(child);
        const wMode = child.getPluginData("wMode") || "FIXED";
        const hMode = child.getPluginData("hMode") || "FIXED";
        const pDir = parent.layoutMode; // "HORIZONTAL" ou "VERTICAL"

        if (pDir === "HORIZONTAL") {
            if (wMode === "FILL") child.layoutGrow = 1;
            if (hMode === "FILL") child.layoutAlign = "STRETCH";
        } else if (pDir === "VERTICAL") {
            if (hMode === "FILL") child.layoutGrow = 1;
            if (wMode === "FILL") child.layoutAlign = "STRETCH";
        }
    }

    // Limpar e criar página 'teste'
    let pg = figma.root.children.find(n => n.name.toLowerCase() === "teste");
    if(!pg) { pg = figma.createPage(); pg.name = "teste"; }
    figma.currentPage = pg;
    pg.children.forEach(n => n.remove());

    // ==========================================
    // ROOT da Tela
    // ==========================================
    const SCREEN = createBox({
        name: "Dashboard (Pixel Perfect Final)", width: 1440, height: 900,
        wMode: "FIXED", hMode: "FIXED", direction: "HORIZONTAL", fillHex: "#0f0f12", clip: true
    });
    
    // SIDEBAR
    const SIDEBAR = createBox({
        name: "Sidebar", width: 224, wMode: "FIXED", hMode: "FILL", direction: "VERTICAL",
        fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1
    });
    
    const SIDEBAR_HEADER = createBox({
        name: "Header", height: 64, wMode: "FILL", hMode: "FIXED", direction: "HORIZONTAL", alignItems: "CENTER", pX: 12, gap: 12,
        strokeHex: "#2e2e33", strokeWt: 1
    });
    appendNode(SIDEBAR_HEADER, createIconPlace(32, "#6366f1")); 
    appendNode(SIDEBAR_HEADER, createText({text: "Vagas UX", size: 16, weight: "Bold"}));
    appendNode(SIDEBAR, SIDEBAR_HEADER);
    
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
        appendNode(navItem, createIconPlace(20, item.active ? "#ffffff" : "#a1a1aa"));
        appendNode(navItem, createText({
            text: item.label, size: 14, weight: item.active ? "SemiBold" : "Regular", fillHex: item.active ? "#ffffff" : "#a1a1aa", wMode: "FILL"
        }));
        appendNode(SIDEBAR_NAV, navItem);
    });
    appendNode(SIDEBAR, SIDEBAR_NAV);

    const SIDEBAR_BOT = createBox({
        name: "Bottom", wMode: "FILL", hMode: "HUG", direction: "VERTICAL", pAll: 8, strokeHex: "#2e2e33", strokeWt: 1
    });
    const themeBtn = createBox({
        name: "Theme Toggle", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", pX: 12, pY: 10, gap: 12, radiusAll: 8
    });
    appendNode(themeBtn, createIconPlace(20, "#a1a1aa"));
    appendNode(themeBtn, createText({text: "Light Mode", size: 14, weight: "Regular", fillHex: "#a1a1aa", wMode: "FILL"}));
    appendNode(SIDEBAR_BOT, themeBtn);
    appendNode(SIDEBAR, SIDEBAR_BOT);

    // ==========================================
    // MAIN CONTENT
    // ==========================================
    const MAIN = createBox({
        name: "Main App Area", wMode: "FILL", hMode: "FILL", direction: "VERTICAL", fillHex: "#0f0f12"
    });

    // --- MAIN HEADER ---
    const MAIN_HEADER = createBox({
        name: "Main Header", wMode: "FILL", hMode: "HUG", direction: "VERTICAL", fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1
    });

    const STATS_ROW = createBox({
        name: "Stats Row", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", gap: 12, pX: 16, pY: 12, strokeHex: "#2e2e33", strokeWt: 1, wrap: true
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
        appendNode(leftWrap, createIconPlace(24, s.col, 0.15));
        appendNode(leftWrap, createText({text: s.t, size: 12, fillHex: "#a1a1aa"}));
        appendNode(scard, leftWrap);
        appendNode(scard, createText({text: s.v, size: 20, weight: "Bold", fillHex: s.col}));
        appendNode(STATS_ROW, scard);
    });
    appendNode(MAIN_HEADER, STATS_ROW);

    const TOOLBAR_ROW = createBox({
        name: "Toolbar Settings", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", gap: 12, pX: 16, pY: 12, strokeHex: "#2e2e33", strokeWt: 1
    });
    
    const tBtn1 = createBox({name: "Periodo", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 8, fillHex: "#252529", radiusAll: 8, wMode: "HUG", hMode:"HUG"});
    appendNode(tBtn1, createIconPlace(14, "#a1a1aa"));
    appendNode(tBtn1, createText({text:"Todo período", size: 12, fillHex: "#a1a1aa"}));
    appendNode(TOOLBAR_ROW, tBtn1);

    const searchBar = createBox({
        name: "Search Input", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 8, fillHex: "#252529", radiusAll: 8
    });
    appendNode(searchBar, createIconPlace(14, "#a1a1aa"));
    appendNode(searchBar, createText({text:"Buscar vagas...", size: 12, fillHex: "#a1a1aa"}));
    appendNode(TOOLBAR_ROW, searchBar);

    const tBtn2 = createBox({name: "Ordenacao", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 8, fillHex: "#252529", radiusAll: 8, wMode: "HUG", hMode:"HUG"});
    appendNode(tBtn2, createIconPlace(14, "#a1a1aa"));
    appendNode(tBtn2, createText({text:"Compatibilidade", size: 12, fillHex: "#a1a1aa"}));
    appendNode(TOOLBAR_ROW, tBtn2);
    
    appendNode(TOOLBAR_ROW, createBox({name: "Spacer", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL"}));

    const toggleBox = createBox({name: "Mode Toggle", direction: "HORIZONTAL", alignItems: "CENTER", gap: 4, pAll: 4, fillHex: "#252529", radiusAll: 8, wMode: "HUG", hMode:"HUG"});
    appendNode(toggleBox, createBox({name: "Grid Active", wMode: "FIXED", hMode: "FIXED", width: 28, height: 28, fillHex: "#1a1a1f", radiusAll: 6, shadow: {color: {r:0,g:0,b:0,a:0.2}, x:0, y:2, radius:4}}));
    appendNode(toggleBox, createBox({name: "List Inactive", wMode: "FIXED", hMode: "FIXED", width: 28, height: 28, fillHex: "#252529", radiusAll: 6}));
    appendNode(TOOLBAR_ROW, toggleBox);

    const btnGroup = createBox({name: "Refresh Group", direction: "HORIZONTAL", wMode: "HUG", hMode: "HUG"});
    const btnRefresh = createBox({name: "Refresh", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 16, pY: 8, fillHex: "#6366f1", tl: 8, bl: 8, tr: 0, br: 0, wMode:"HUG", hMode:"HUG"});
    appendNode(btnRefresh, createIconPlace(14, "#ffffff"));
    appendNode(btnRefresh, createText({text:"Atualizar Vagas", size: 12, weight: "Medium", fillHex: "#ffffff"}));
    appendNode(btnGroup, btnRefresh);
    appendNode(btnGroup, createBox({name: "Divider", width: 1, wMode: "FIXED", hMode: "FILL", fillHex: "#ffffff", fillAlpha: 0.2}));
    const btnTimer = createBox({name: "Timer", direction: "HORIZONTAL", alignItems: "CENTER", pX: 10, pY: 8, fillHex: "#6366f1", tl: 0, bl: 0, tr: 8, br: 8, wMode:"HUG", hMode:"HUG"});
    appendNode(btnTimer, createIconPlace(14, "#ffffff"));
    appendNode(btnGroup, btnTimer);
    appendNode(TOOLBAR_ROW, btnGroup);

    appendNode(MAIN_HEADER, TOOLBAR_ROW);

    const TABS_ROW = createBox({
        name: "Tabs Row", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", justifyContent: "SPACE_BETWEEN", alignItems: "CENTER", pX: 16, pt: 8
    });
    
    const tabsWrapLeft = createBox({name: "Left Tabs", direction: "HORIZONTAL", alignItems: "CENTER", gap: 16, wMode: "HUG", hMode: "HUG"});
    const filtersBtn = createBox({name: "Filter Sidebar Toggle", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, pX: 12, pY: 6, fillHex: "#6366f1", fillAlpha: 0.1, radiusAll: 8, wMode:"HUG", hMode:"HUG"});
    appendNode(filtersBtn, createIconPlace(16, "#6366f1"));
    appendNode(filtersBtn, createText({text: "Filtros", size: 14, weight: "Medium", fillHex: "#6366f1"}));
    appendNode(tabsWrapLeft, filtersBtn);
    
    appendNode(tabsWrapLeft, createBox({name: "Divider", width: 1, height: 20, wMode:"FIXED", hMode:"FIXED", fillHex: "#2e2e33"}));

    const tList = [{l: "Todas", v:"114", a:true}, {l: "Favoritos", v:"0"}, {l: "Destaques", v:"0"}, {l: "Indeed", v:"36"}, {l: "LinkedIn", v:"34"}, {l: "Posts", v:"44"}];
    const tabsListCont = createBox({name: "Tabs Text", direction: "HORIZONTAL", wMode: "HUG", hMode: "HUG"});
    tList.forEach(t => {
        const tb = createBox({name: t.l, direction: "VERTICAL", gap: 8, wMode: "HUG", hMode: "HUG"}); 
        const tlInner = createBox({name: "Inner", direction: "HORIZONTAL", gap: 6, pX: 16, pt: 8, pb: 6, wMode: "HUG", hMode: "HUG", alignItems: "CENTER"});
        appendNode(tlInner, createText({text: t.l, size: 14, weight: t.a ? "Medium" : "Regular", fillHex: t.a ? "#ffffff" : "#a1a1aa"}));
        appendNode(tlInner, createText({text: t.v, size: 12, fillHex: t.a ? "#a1a1aa" : "#71717a"}));
        appendNode(tb, tlInner);
        
        if (t.a) appendNode(tb, createBox({name: "Active Line", height: 2, wMode:"FILL", hMode:"FIXED", fillHex:"#6366f1"}));
        else appendNode(tb, createBox({name: "Invisible Line", height: 2, wMode:"FILL", hMode:"FIXED", fillHex:"#6366f1", fillAlpha: 0}));

        appendNode(tabsListCont, tb);
    });
    appendNode(tabsWrapLeft, tabsListCont);
    appendNode(TABS_ROW, tabsWrapLeft);

    const pagBox = createBox({name: "Pagination", direction: "HORIZONTAL", alignItems: "CENTER", gap: 8, wMode: "HUG", hMode: "HUG", pb: 8});
    [1,2].forEach(i => appendNode(pagBox, createIconPlace(20, "#252529")));
    appendNode(pagBox, createText({text:"1 / 10", size: 12, fillHex:"#a1a1aa"}));
    [1,2].forEach(i => appendNode(pagBox, createIconPlace(20, "#252529")));
    appendNode(TABS_ROW, pagBox);

    appendNode(MAIN_HEADER, TABS_ROW);
    appendNode(MAIN, MAIN_HEADER);

    // --- CONTENT AREA (Filtros Sidebar + Cards Grid) ---
    const APP_CONTENT = createBox({
        name: "Content Splitter", wMode: "FILL", hMode: "FILL", direction: "HORIZONTAL"
    });

    const APP_SIDEBAR = createBox({
        name: "Filtros Sidebar", width: 224, wMode: "FIXED", hMode: "FILL", direction: "VERTICAL", pAll: 16, gap: 24, fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1
    });

    ["Nível", "Modalidade", "Status"].forEach(fGrp => {
        const grp = createBox({name: fGrp, wMode: "FILL", hMode: "HUG", direction: "VERTICAL", gap: 12});
        appendNode(grp, createText({text: fGrp, size: 14, weight: "SemiBold", fillHex: "#ffffff"}));
        [1,2,3].forEach(i => {
           const row = createBox({name: "Row", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", alignItems: "CENTER", gap: 12});
           appendNode(row, createBox({name: "cbx", wMode:"FIXED", hMode:"FIXED", width: 16, height: 16, radiusAll: 4, fillHex: "#252529", strokeHex: "#2e2e33", strokeWt:1}));
           appendNode(row, createText({text: fGrp === "Status" ? `Status ${i}` : `Opção ${i}`, size: 12, fillHex: "#a1a1aa", wMode: "FILL"}));
           appendNode(grp, row);
        });
        appendNode(APP_SIDEBAR, grp);
    });
    appendNode(APP_CONTENT, APP_SIDEBAR);

    const SCROLL_CARDS = createBox({
        name: "List of Vagas", wMode: "FILL", hMode: "FILL", direction: "VERTICAL", pAll: 16
    });

    const CARDS_WRAP = createBox({
        name: "Grid Wrap", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", gap: 16, wrap: true
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
        const cardBox = createBox({
            name: `Card ${i}`, width: 300, wMode: "FIXED", hMode: "HUG", direction: "VERTICAL", pAll: 20, gap: 16,
            fillHex: "#1a1a1f", strokeHex: "#2e2e33", strokeWt: 1, radiusAll: 16,
            shadow: { color: {r:0,g:0,b:0,a:0.1}, x: 0, y: 4, radius: 12 }
        });

        const cardH1 = createBox({name: "Header Line", wMode: "FILL", hMode: "HUG", direction: "HORIZONTAL", justifyContent: "SPACE_BETWEEN", alignItems: "CENTER"});
        const badgeWrap = createBox({name: "Badges", direction: "HORIZONTAL", gap: 8, wMode: "HUG", hMode: "HUG", alignItems: "CENTER"});
        
        const srcBadge = createBox({name: "Fonte", pX: 8, pY: 4, fillHex: "#252529", strokeHex: "#2e2e33", strokeWt: 1, radiusAll: 12, wMode:"HUG", hMode:"HUG", alignItems:"CENTER", justifyContent:"CENTER"});
        appendNode(srcBadge, createText({text: cd.source, size: 10, fillHex: "#a1a1aa"}));
        appendNode(badgeWrap, srcBadge);

        const scoreBadge = createBox({name: "Match", pX: 8, pY: 4, fillHex: "#22c55e", fillAlpha: 0.15, radiusAll: 12, wMode:"HUG", hMode:"HUG", alignItems:"CENTER", justifyContent:"CENTER"});
        appendNode(scoreBadge, createText({text: `${cd.score}% Match`, size: 10, weight: "SemiBold", fillHex: "#22c55e"}));
        appendNode(badgeWrap, scoreBadge);
        appendNode(cardH1, badgeWrap);
        
        const actsWrap = createBox({name: "Fav", direction: "HORIZONTAL", gap: 8, wMode: "HUG", hMode: "HUG"});
        appendNode(actsWrap, createIconPlace(28, "#252529")); 
        appendNode(cardH1, actsWrap);
        
        appendNode(cardBox, cardH1);

        const tWrap = createBox({name: "TitleBlock", direction: "VERTICAL", gap: 4, wMode: "FILL", hMode: "HUG"});
        appendNode(tWrap, createText({text: cd.title, size: 16, weight: "Bold", wMode: "FILL"}));
        appendNode(tWrap, createText({text: cd.emp, size: 12, fillHex: "#a1a1aa", wMode: "FILL"}));
        appendNode(cardBox, tWrap);

        const tagsWrp = createBox({name: "Tags", direction: "HORIZONTAL", gap: 6, wMode: "FILL", hMode: "HUG", wrap: true});
        ["Remoto", "Sênior", "R$ 15k-20k"].forEach(tgS => {
           const tgB = createBox({name: "Tag", pX: 8, pY: 4, fillHex: "#252529", radiusAll: 12, wMode:"HUG", hMode:"HUG"});
           appendNode(tgB, createText({text: tgS, size: 10, fillHex: "#a1a1aa"}));
           appendNode(tagsWrp, tgB);
        });
        appendNode(cardBox, tagsWrp);

        const btnRow = createBox({name: "Footer Actions", direction: "HORIZONTAL", gap: 8, wMode: "FILL", hMode: "HUG", pt: 8});
        const mBtn1 = createBox({
            name: "PrimaryAction", direction: "HORIZONTAL", wMode: "FILL", hMode: "HUG", justifyContent: "CENTER", pY: 8, 
            strokeHex: "#25D366", strokeWt: 1, radiusAll: 8, alignItems: "CENTER", gap: 6
        });
        appendNode(mBtn1, createIconPlace(14, "#25D366")); 
        appendNode(mBtn1, createText({text: "WhatsApp", size: 12, weight: "Medium", fillHex: "#25D366"}));
        appendNode(btnRow, mBtn1);

        const aiBtn = createBox({
            name: "AI Pitch", wMode: "FIXED", hMode: "FIXED", width: 34, height: 34, radiusAll: 8,
            fillHex: "#a855f7", fillAlpha: 0.1, strokeHex: "#a855f7", strokeAlpha: 0.3, strokeWt: 1,
            direction: "HORIZONTAL", justifyContent: "CENTER", alignItems: "CENTER"
        });
        appendNode(aiBtn, createIconPlace(14, "#a855f7"));
        appendNode(btnRow, aiBtn);

        appendNode(cardBox, btnRow);

        appendNode(CARDS_WRAP, cardBox);
    });

    appendNode(SCROLL_CARDS, CARDS_WRAP);
    appendNode(APP_CONTENT, SCROLL_CARDS);

    appendNode(MAIN, APP_CONTENT);

    appendNode(SCREEN, SIDEBAR);
    appendNode(SCREEN, MAIN);
    appendNode(pg, SCREEN);

    figma.viewport.scrollAndZoomIntoView([SCREEN]);

    console.log("✅ Dashboard 1:1 FINAL v2 (Pixel-Perfect Wrapper) injetado na nova pagina teste!");
    figma.notify("✅ Dashboard Vagas UX gerado 1:1 com sucesso!", {timeout: 3000, error: false});

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
            print("✅ Pixel Perfect v2 enviado para o Figma!")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if inject() else 1)
