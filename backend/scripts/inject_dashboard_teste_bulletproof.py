#!/usr/bin/env python3
"""
Dashboard 1:1 Bulletproof - Pixel Perfect React Clone
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

    // Bulletproof Frame function (doesn't use problematic advanced AutoLayout layoutGrow features)
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
        f.primaryAxisSizingMode = opts.wFixed ? "FIXED" : "AUTO";
        f.counterAxisSizingMode = opts.hFixed ? "FIXED" : "AUTO";
        // Special case for root/fixed sized boxes overriding the direction-based rules:
        if (opts.w && opts.h) {
             f.primaryAxisSizingMode = "FIXED";
             f.counterAxisSizingMode = "FIXED";
        }

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
      }
      return f;
    }

    function txt(s, sz, wt, col) {
      const t = figma.createText();
      t.fontName = {family:"Inter", style:wt};
      t.characters = String(s);
      t.fontSize = sz;
      t.fills = fill(col);
      return t;
    }

    // Limpar e criar página
    let pg = figma.root.children.find(n => n.name.toLowerCase() === "teste");
    if(!pg) { pg = figma.createPage(); pg.name = "teste"; }
    figma.currentPage = pg;
    pg.children.forEach(n => { n.remove(); });

    // ROOT: 1440×900
    const ROOT = frame({
      name: "Dashboard React Clone", 
      dir: "HORIZONTAL",
      bg: "#0f0f12", 
      w: 1440, h: 900, 
      wFixed: true, hFixed: true, 
      gap: 0
    });
    ROOT.x = 0; ROOT.y = 0;

    // ═══════════════════════════════════
    // SIDEBAR (224px × 900)
    // ═══════════════════════════════════
    const SIDEBAR = frame({
      name: "Sidebar (App.jsx)",
      dir: "VERTICAL",
      bg: "#1a1a1f",
      w: 224, h: 900,
      wFixed: true, hFixed: true,
      stroke: "#2e2e33", strokeOp: 1, strokeAlign: "INSIDE", sw: 1, // border-r
      gap: 16, pt: 24, pb: 24, pX: 16
    });

    const sbHeader = frame({name: "Header", dir: "HORIZONTAL", gap: 12, ai: "CENTER", pX: 4});
    const logoBlock = frame({name: "Logo", w: 32, h: 32, wFixed: true, hFixed: true, bg: "#6366f1", r: 8, bgOp: 0.15});
    sbHeader.appendChild(logoBlock);
    sbHeader.appendChild(txt("Vagas UX", 18, "Bold", "#ffffff"));
    SIDEBAR.appendChild(sbHeader);

    const sbNav = frame({name: "Navigation", dir: "VERTICAL", gap: 4, pt: 16});
    [
      {l: "Dashboard", a: true}, {l: "Meu Perfil", a: false}, 
      {l: "Match", a: false}, {l: "Configurações", a: false}
    ].forEach(item => {
      const nItem = frame({
        name: item.l, dir: "HORIZONTAL", gap: 12, ai: "CENTER", 
        w: 192, h: 40, wFixed: true, hFixed: true, pX: 12, r: 8,
        bg: item.a ? "#6366f1" : undefined
      });
      const iconP = frame({name: "Icon", w:20, h:20, wFixed:true, hFixed:true, bg: item.a?"#ffffff":"#a1a1aa"});
      nItem.appendChild(iconP);
      nItem.appendChild(txt(item.l, 14, item.a ? "Semi Bold" : "Regular", item.a ? "#ffffff" : "#a1a1aa"));
      sbNav.appendChild(nItem);
    });
    SIDEBAR.appendChild(sbNav);
    ROOT.appendChild(SIDEBAR);

    // ═══════════════════════════════════
    // MAIN (1216px × 900)
    // ═══════════════════════════════════
    const MAIN = frame({
      name: "Main Area",
      dir: "VERTICAL",
      bg: "#0f0f12",
      w: 1216, h: 900,
      wFixed: true, hFixed: true,
      gap: 0
    });

    // --- Header Fixo ---
    const HEADER = frame({
        name: "Header", dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", sw: 1,
        w: 1216, h: 164, wFixed: true, hFixed: true
    });

    // 1. Stats Row (68px)
    const STATS_ROW = frame({
        name: "Stats Row", dir: "HORIZONTAL", w: 1216, h: 68, wFixed: true, hFixed: true,
        gap: 12, pX: 16, pY: 12, stroke: "#2e2e33", sw: 1, ai: "CENTER"
    });
    const statsData = [
      { l: "Total", v: "114", c: "#22c55e" }, { l: "Pendentes", v: "89", c: "#f59e0b" },
      { l: "Aplicadas", v: "3", c: "#6366f1" }, { l: "24h", v: "12", c: "#0ea5e9" }, { l: "Destaques", v: "8", c: "#22c55e" }
    ];
    statsData.forEach(s => {
        const scard = frame({
            name: s.l, dir: "HORIZONTAL", w: 226, h: 44, wFixed: true, hFixed: true,
            bg: "#1a1a1f", r: 8, stroke: "#2e2e33", pX: 12, jc: "SPACE_BETWEEN", ai:"CENTER"
        });
        const cl = frame({name:"v", dir:"HORIZONTAL", gap:8, ai:"CENTER"});
        cl.appendChild(frame({name:"ic", w:20, h:20, wFixed:true, hFixed:true, bg:s.c, bgOp:0.15, r:4}));
        cl.appendChild(txt(s.l, 12, "Regular", "#a1a1aa"));
        scard.appendChild(cl);
        scard.appendChild(txt(s.v, 18, "Bold", s.c));
        STATS_ROW.appendChild(scard);
    });
    HEADER.appendChild(STATS_ROW);

    // 2. Toolbar Row (52px)
    const TOOLBAR_ROW = frame({
        name: "Toolbar", dir: "HORIZONTAL", w: 1216, h: 52, wFixed: true, hFixed: true,
        gap: 12, pX: 16, ai: "CENTER", stroke: "#2e2e33", sw: 1
    });
    // Period Dropdown
    const tBtn1 = frame({name: "Periodo", dir:"HORIZONTAL", ai:"CENTER", gap:6, pX:12, h:28, hFixed:true, bg:"#252529", r:8});
    tBtn1.appendChild(frame({name:"ic", w:14,h:14,wFixed:true,hFixed:true,bg:"#a1a1aa"}));
    tBtn1.appendChild(txt("Todo período", 12, "Regular", "#a1a1aa"));
    tBtn1.appendChild(frame({name:"ic", w:12,h:12,wFixed:true,hFixed:true,bg:"#a1a1aa"}));
    TOOLBAR_ROW.appendChild(tBtn1);

    // Search Input
    const searchInp = frame({name:"Search", dir:"HORIZONTAL", ai:"CENTER", gap:8, pX:12, w: 340, wFixed:true, h:28, hFixed:true, bg:"#252529", r:8});
    searchInp.appendChild(frame({name:"ic", w:14,h:14,wFixed:true,hFixed:true,bg:"#71717a"}));
    searchInp.appendChild(txt("Buscar vagas...", 12, "Regular", "#a1a1aa"));
    TOOLBAR_ROW.appendChild(searchInp);

    // Sort Dropdown
    const tBtn2 = frame({name: "Ordenacao", dir:"HORIZONTAL", ai:"CENTER", gap:6, pX:12, h:28, hFixed:true, bg:"#252529", r:8});
    tBtn2.appendChild(frame({name:"ic", w:14,h:14,wFixed:true,hFixed:true,bg:"#a1a1aa"}));
    tBtn2.appendChild(txt("Compatibilidade", 12, "Regular", "#a1a1aa"));
    tBtn2.appendChild(frame({name:"ic", w:12,h:12,wFixed:true,hFixed:true,bg:"#a1a1aa"}));
    TOOLBAR_ROW.appendChild(tBtn2);

    HEADER.appendChild(TOOLBAR_ROW);

    // 3. Tabs Row (44px)
    const TABS_ROW = frame({
        name: "Tabs Row", dir: "HORIZONTAL", w: 1216, h: 44, wFixed: true, hFixed: true,
        gap: 16, pX: 16, pt: 8, ai: "CENTER", jc: "SPACE_BETWEEN"
    });
    
    const tabsLeft = frame({name: "Left", dir:"HORIZONTAL", gap:16, ai:"CENTER"});
    
    // Filter Btn
    const tFl = frame({name: "FilterBtn", dir:"HORIZONTAL", ai:"CENTER", gap:6, pX:12, h:28, hFixed:true, bg:"#6366f1", bgOp:0.1, r:8});
    tFl.appendChild(frame({name:"ic", w:14,h:14,wFixed:true,hFixed:true,bg:"#6366f1"}));
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

    const tabsRight = frame({name: "Pagination", dir:"HORIZONTAL", gap:8, ai:"CENTER"});
    tabsRight.appendChild(frame({name:"ic1", w:24,h:24,wFixed:true,hFixed:true,bg:"#252529", r:4}));
    tabsRight.appendChild(txt("1 / 10", 12, "Regular", "#a1a1aa"));
    tabsRight.appendChild(frame({name:"ic2", w:24,h:24,wFixed:true,hFixed:true,bg:"#252529", r:4}));
    TABS_ROW.appendChild(tabsRight);

    HEADER.appendChild(TABS_ROW);
    MAIN.appendChild(HEADER);

    // --- Content Area ---
    const CONTENT = frame({
        name: "Screen Body", dir: "HORIZONTAL", bg: "#0f0f12", 
        w: 1216, h: 736, wFixed: true, hFixed: true,
        pAll: 16, gap: 16
    });

    // Filtros Sidebar (256px)
    const FILTERS_SIDEBAR = frame({
        name: "Sidebar Filtros", dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", sw: 1, r: 12,
        w: 256, h: 704, wFixed: true, hFixed: true, gap: 24, pAll: 16
    });

    ["Nível", "Modalidade", "Status"].forEach(fGrp => {
        const grp = frame({name: fGrp, dir: "VERTICAL", gap: 12, w: 224, wFixed:true});
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

    // Grid VagaCards (912px) (3 cards of 293px + gap 16px)
    const GRID_AREA = frame({
        name: "Cards Grid List", dir: "VERTICAL", bg: "#0f0f12", 
        w: 912, h: 704, wFixed: true, hFixed: true, gap: 16
    });

    const cardsData = [
      {title: "Product Designer Sênior — Design System", score: 92, source: "LinkedIn", e: "Neon"},
      {title: "UX Designer Pleno — Growth & Experimentation", score: 85, source: "Indeed", e: "Nubank"},
      {title: "UX Lead — Seller Experience & Onboarding", score: 78, source: "Posts", e: "Mercado Livre"},
      {title: "Product Designer — Mobile & Consumer Apps", score: 74, source: "LinkedIn", e: "Itaú"},
      {title: "UX/UI Designer — Plataforma B2B SaaS", score: 71, source: "Indeed", e: "TOTVS"},
      {title: "Senior UX Designer — Fintech Products", score: 68, source: "Posts", e: "Creditas"}
    ];

    let r1 = frame({name:"Row 1", dir:"HORIZONTAL", gap:16, w:912, wFixed:true, h: 320, hFixed:true});
    let r2 = frame({name:"Row 2", dir:"HORIZONTAL", gap:16, w:912, wFixed:true, h: 320, hFixed:true});

    cardsData.forEach((cd, i) => {
        const targetRow = i < 3 ? r1 : r2;
        const cardBox = frame({
            name: `Card ${i}`, dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", sw: 1, r: 16,
            w: 293, h: 320, wFixed: true, hFixed: true, pAll: 20
        });

        // H1 header
        const cardH1 = frame({name: "Card Header", dir: "HORIZONTAL", w: 253, wFixed:true, h:24, hFixed:true, jc: "SPACE_BETWEEN", ai: "CENTER"});
        const badgeWrap = frame({name: "Badges", dir: "HORIZONTAL", gap: 8, ai: "CENTER"});
        
        const srcBadge = frame({name: "Fonte", dir:"HORIZONTAL", ai:"CENTER", jc:"CENTER", pX: 8, pY: 4, bg: "#252529", stroke: "#2e2e33", sw: 1, r: 12});
        srcBadge.appendChild(txt(cd.source, 10, "Regular", "#a1a1aa"));
        badgeWrap.appendChild(srcBadge);

        const scoreBadge = frame({name: "Match", dir:"HORIZONTAL", ai:"CENTER", jc:"CENTER", pX: 8, pY: 4, bg: "#22c55e", bgOp: 0.15, r: 12});
        scoreBadge.appendChild(txt(`${cd.score}% Match`, 10, "Semi Bold", "#22c55e"));
        badgeWrap.appendChild(scoreBadge);
        cardH1.appendChild(badgeWrap);
        
        const favIcon = frame({name: "Fav", w:28, h:28, wFixed:true, hFixed:true, bg: "#252529", r:8}); 
        cardH1.appendChild(favIcon);
        
        cardBox.appendChild(cardH1);

        // Titles (marginTop=16)
        const tWrap = frame({name: "TitleBlock", dir: "VERTICAL", gap: 4, pt: 16, pb: 16, w: 253, wFixed:true});
        tWrap.appendChild(txt(cd.title, 14, "Bold", "#ffffff"));
        tWrap.appendChild(txt(cd.e, 12, "Regular", "#a1a1aa"));
        cardBox.appendChild(tWrap);

        // Tags
        const tagsWrp = frame({name: "Tags", dir: "HORIZONTAL", gap: 6});
        ["Remoto", "Sênior", "R$ 15k-20k"].forEach(tgS => {
           const tgB = frame({name: "Tag", dir:"HORIZONTAL", ai:"CENTER", jc:"CENTER", pX: 8, pY: 4, bg: "#252529", r: 12});
           tgB.appendChild(txt(tgS, 10, "Regular", "#a1a1aa"));
           tagsWrp.appendChild(tgB);
        });
        cardBox.appendChild(tagsWrp);

        // Sub Actions (gap in card box will push this if we don't fix height. But we just add spacing.)
        const spacer = frame({name:"Spacer", w:1, h: 48, wFixed:true, hFixed:true});
        cardBox.appendChild(spacer);

        // Botões
        const btnRow = frame({name: "Footer Actions", dir: "HORIZONTAL", gap: 8, ai: "CENTER", w: 253, wFixed:true});
        const mBtn1 = frame({
            name: "WhatsApp", dir: "HORIZONTAL", ai: "CENTER", jc: "CENTER", gap: 6, pY: 8, r: 8, stroke: "#25D366", sw: 1, w: 200, wFixed:true
        });
        mBtn1.appendChild(frame({name:"ic",w:14,h:14,wFixed:true,hFixed:true,bg:"#25D366"})); 
        mBtn1.appendChild(txt("WhatsApp", 12, "Medium", "#25D366"));
        btnRow.appendChild(mBtn1);

        const aiBtn = frame({
            name: "AI Pitch", dir: "HORIZONTAL", ai: "CENTER", jc: "CENTER", w: 45, h: 32, wFixed: true, hFixed: true, r: 8,
            bg: "#a855f7", bgOp: 0.1, stroke: "#a855f7", strokeOp: 0.3, sw: 1
        });
        aiBtn.appendChild(frame({name:"ic",w:14,h:14,wFixed:true,hFixed:true,bg:"#a855f7"}));
        btnRow.appendChild(aiBtn);

        cardBox.appendChild(btnRow);
        targetRow.appendChild(cardBox);
    });

    GRID_AREA.appendChild(r1);
    GRID_AREA.appendChild(r2);
    
    CONTENT.appendChild(GRID_AREA);
    MAIN.appendChild(CONTENT);

    ROOT.appendChild(MAIN);
    pg.appendChild(ROOT);
    figma.viewport.scrollAndZoomIntoView([ROOT]);

    console.log("✅ Dashboard 1:1 Bulletproof (Pixel-Perfect React Clone) injetado!");
    figma.notify("✅ Dashboard Vagas UX RECRIADO com Sucesso (v3)", {timeout: 3000, error: false});

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
            print("✅ Pixel Perfect Bulletproof enviado para o Figma!")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if inject() else 1)
