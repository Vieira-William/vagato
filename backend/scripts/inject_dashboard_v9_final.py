#!/usr/bin/env python3
"""
Dashboard 1:1 FINAL - Pixel Perfect vs React Real App
Baseado na screenshot real da aplicação
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

    function frame(opts) {
      const f = figma.createFrame();
      f.name = opts.name || "Frame";
      f.fills = opts.bg ? fill(opts.bg, opts.bgOp||1) : none();
      if (opts.w && opts.h) f.resize(opts.w, opts.h);
      if (opts.r !== undefined) f.cornerRadius = opts.r;
      if (opts.stroke) { f.strokes=fill(opts.stroke,opts.strokeOp||1); f.strokeWeight=opts.sw||1; f.strokeAlign="INSIDE"; }
      if (opts.dir) {
        f.layoutMode = opts.dir;
        f.primaryAxisSizingMode = opts.wFixed ? "FIXED" : "AUTO";
        f.counterAxisSizingMode = opts.hFixed ? "FIXED" : "AUTO";
        if (opts.gap!==undefined) f.itemSpacing = opts.gap;
        if (opts.pl!==undefined) f.paddingLeft=opts.pl;
        if (opts.pr!==undefined) f.paddingRight=opts.pr;
        if (opts.pt!==undefined) f.paddingTop=opts.pt;
        if (opts.pb!==undefined) f.paddingBottom=opts.pb;
        if (opts.jc) f.primaryAxisAlignItems=opts.jc;
        if (opts.ai) f.counterAxisAlignItems=opts.ai;
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
    let pg = figma.root.children.find(n => n.name === "[SCREENS] Dashboard");
    if(!pg) { pg = figma.createPage(); pg.name = "[SCREENS] Dashboard"; }
    figma.currentPage = pg;
    
    pg.children.forEach(n => { if(n.name.includes("Dashboard 1:1")) n.remove(); });

    // ROOT: 1440×900
    const ROOT = frame({
      name: "Dashboard 1:1", 
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
      name: "Sidebar",
      dir: "VERTICAL",
      bg: "#0f0f12",
      w: 224, h: 900,
      wFixed: true, hFixed: true,
      gap: 16,
      pl: 16, pr: 16, pt: 24, pb: 24
    });

    const logo = txt("Vagas UX", 18, "Bold", "#ffffff");
    SIDEBAR.appendChild(logo);

    const navItems = ["Dashboard", "Meu Perfil", "Match", "Configurações"];
    navItems.forEach((item, idx) => {
      const nav = txt(item, 14, idx === 0 ? "Semi Bold" : "Regular", 
                      idx === 0 ? "#6366f1" : "#a1a1aa");
      SIDEBAR.appendChild(nav);
    });

    ROOT.appendChild(SIDEBAR);

    // ═══════════════════════════════════
    // MAIN (1216px × 900)
    // ═══════════════════════════════════
    const MAIN = frame({
      name: "Main",
      dir: "VERTICAL",
      bg: "#0f0f12",
      w: 1216, h: 900,
      wFixed: true, hFixed: true,
      gap: 0
    });

    // ─────────────────────────────────
    // HEADER STATS (5 cards) - 60px
    // ─────────────────────────────────
    const STATS_ROW = frame({
      name: "Stats Row",
      dir: "HORIZONTAL",
      bg: "#0f0f12",
      w: 1216, h: 60,
      wFixed: true, hFixed: true,
      gap: 16,
      pl: 20, pr: 20, pt: 12, pb: 12,
      ai: "CENTER"
    });

    const statsData = [
      {label: "Total", value: "114"},
      {label: "Pendentes", value: "89"},
      {label: "Aplicadas", value: "3"},
      {label: "24h", value: "12"},
      {label: "Destaques", value: "8"}
    ];

    statsData.forEach(stat => {
      const statCard = frame({
        name: stat.label,
        dir: "HORIZONTAL",
        bg: "#1a1a1f",
        w: 220, h: 36,
        wFixed: true, hFixed: true,
        r: 8,
        gap: 8,
        pl: 12, pr: 12,
        ai: "CENTER"
      });

      const lbl = txt(stat.label, 11, "Regular", "#a1a1aa");
      statCard.appendChild(lbl);

      const val = txt(stat.value, 18, "Bold", "#6366f1");
      statCard.appendChild(val);

      STATS_ROW.appendChild(statCard);
    });

    MAIN.appendChild(STATS_ROW);

    // ─────────────────────────────────
    // TOOLBAR (período, busca, ordenação) - 48px
    // ─────────────────────────────────
    const TOOLBAR = frame({
      name: "Toolbar",
      dir: "HORIZONTAL",
      bg: "#0f0f12",
      w: 1216, h: 48,
      wFixed: true, hFixed: true,
      gap: 12,
      pl: 20, pr: 20, pt: 12, pb: 12,
      ai: "CENTER"
    });

    ["Todo período", "Buscar...", "Compatibilidade"].forEach(text => {
      const btn = frame({
        name: text,
        dir: "HORIZONTAL",
        bg: "#1a1a1f",
        w: 140, h: 24,
        wFixed: true, hFixed: true,
        r: 6,
        ai: "CENTER", jc: "CENTER"
      });
      const t = txt(text, 12, "Regular", "#ffffff");
      btn.appendChild(t);
      TOOLBAR.appendChild(btn);
    });

    MAIN.appendChild(TOOLBAR);

    // ─────────────────────────────────
    // TABS (6 tabs) - 40px
    // ─────────────────────────────────
    const TABS = frame({
      name: "Tabs",
      dir: "HORIZONTAL",
      bg: "#0f0f12",
      w: 1216, h: 40,
      wFixed: true, hFixed: true,
      gap: 4,
      pl: 20, pr: 20, pt: 8, pb: 8,
      ai: "CENTER"
    });

    const tabsData = ["Todas 114", "Favoritos 0", "Destaques 0", "Indeed 36", "LinkedIn 34", "Posts 44"];
    tabsData.forEach((tab, idx) => {
      const tabBtn = frame({
        name: tab,
        dir: "HORIZONTAL",
        bg: "#1a1a1f",
        w: 110, h: 24,
        wFixed: true, hFixed: true,
        r: 4,
        bgOp: idx === 0 ? 1 : 0.4,
        ai: "CENTER", jc: "CENTER"
      });
      const tabText = txt(tab, 11, "Regular", "#ffffff");
      tabBtn.appendChild(tabText);
      TABS.appendChild(tabBtn);
    });

    MAIN.appendChild(TABS);

    // ─────────────────────────────────
    // CONTENT (Filtros + Cards Grid)
    // ─────────────────────────────────
    const CONTENT = frame({
      name: "Content",
      dir: "HORIZONTAL",
      bg: "#0f0f12",
      w: 1216, h: 752,
      wFixed: true, hFixed: true,
      gap: 16,
      pl: 20, pr: 20, pt: 16, pb: 16
    });

    // FILTERS PANEL (200px)
    const FILTERS_PANEL = frame({
      name: "Filters",
      dir: "VERTICAL",
      bg: "#1a1a1f",
      w: 200, h: 720,
      wFixed: true, hFixed: true,
      r: 8,
      gap: 16,
      pl: 12, pr: 12, pt: 12, pb: 12
    });

    ["Fonte", "Status", "Modalidade", "Inglês"].forEach(label => {
      const filterGroup = frame({
        name: label,
        dir: "VERTICAL",
        gap: 6
      });

      const lbl = txt(label, 11, "Semi Bold", "#ffffff");
      filterGroup.appendChild(lbl);

      const dropdown = frame({
        name: "Dropdown",
        dir: "HORIZONTAL",
        bg: "#0f0f12",
        w: 176, h: 24,
        wFixed: true, hFixed: true,
        r: 4,
        ai: "CENTER", jc: "CENTER"
      });
      const dropText = txt("Todos", 11, "Regular", "#ffffff");
      dropdown.appendChild(dropText);
      filterGroup.appendChild(dropdown);

      FILTERS_PANEL.appendChild(filterGroup);
    });

    CONTENT.appendChild(FILTERS_PANEL);

    // CARDS GRID (980px, 3 cols × 2 rows = 6 cards)
    const CARDS_GRID = frame({
      name: "Cards Grid",
      dir: "VERTICAL",
      bg: "#0f0f12",
      w: 980, h: 720,
      wFixed: true, hFixed: true,
      gap: 16
    });

    const cardsData = [
      {title: "Product Designer Sênior — Design System", score: 92, source: "LinkedIn"},
      {title: "UX Designer Pleno — Growth & Experimentation", score: 85, source: "Indeed"},
      {title: "UX Lead — Seller Experience & Onboarding", score: 78, source: "Posts"},
      {title: "Product Designer — Mobile & Consumer Apps", score: 74, source: "LinkedIn"},
      {title: "UX/UI Designer — Plataforma B2B SaaS", score: 71, source: "Indeed"},
      {title: "Senior UX Designer — Fintech Products", score: 68, source: "Posts"}
    ];

    // 2 rows
    for (let rowIdx = 0; rowIdx < 2; rowIdx++) {
      const row = frame({
        name: `Row ${rowIdx + 1}`,
        dir: "HORIZONTAL",
        bg: "#0f0f12",
        w: 980, h: 340,
        wFixed: true, hFixed: true,
        gap: 16
      });

      // 3 cols per row
      for (let colIdx = 0; colIdx < 3; colIdx++) {
        const cardIdx = rowIdx * 3 + colIdx;
        const cardData = cardsData[cardIdx];

        const vagaCard = frame({
          name: `Card: ${cardData.title}`,
          dir: "VERTICAL",
          bg: "#1a1a1f",
          w: 312, h: 340,
          wFixed: true, hFixed: true,
          r: 8,
          gap: 12,
          pl: 16, pr: 16, pt: 16, pb: 16
        });

        // Card Header (source badge + score %)
        const cardHeader = frame({
          name: "Header",
          dir: "HORIZONTAL",
          bg: "#0f0f12",
          w: 280, h: 20,
          wFixed: true, hFixed: true,
          gap: 8,
          bgOp: 0
        });

        const sourceBadge = txt(cardData.source, 10, "Regular", "#a1a1aa");
        cardHeader.appendChild(sourceBadge);

        const scoreBadge = txt(`${cardData.score}%`, 11, "Semi Bold", "#22c55e");
        cardHeader.appendChild(scoreBadge);

        vagaCard.appendChild(cardHeader);

        // Card Title
        const cardTitle = txt(cardData.title, 13, "Semi Bold", "#ffffff");
        vagaCard.appendChild(cardTitle);

        // Company Name
        const companyName = txt("Empresa Confidencial", 11, "Regular", "#a1a1aa");
        vagaCard.appendChild(companyName);

        // Tags
        const tagsFrame = frame({
          name: "Tags",
          dir: "HORIZONTAL",
          bg: "#0f0f12",
          w: 280, h: 20,
          wFixed: true, hFixed: true,
          gap: 6,
          bgOp: 0
        });

        ["Figma", "Notion"].forEach(tag => {
          const tagEl = frame({
            name: tag,
            dir: "HORIZONTAL",
            bg: "#252529",
            w: 50, h: 20,
            wFixed: true, hFixed: true,
            r: 4,
            ai: "CENTER", jc: "CENTER"
          });
          const tagText = txt(tag, 10, "Regular", "#a1a1aa");
          tagEl.appendChild(tagText);
          tagsFrame.appendChild(tagEl);
        });

        vagaCard.appendChild(tagsFrame);

        // Action Buttons
        const actionsFrame = frame({
          name: "Actions",
          dir: "HORIZONTAL",
          bg: "#0f0f12",
          w: 280, h: 28,
          wFixed: true, hFixed: true,
          gap: 6,
          bgOp: 0
        });

        ["Pendente", "✨", "Aplicar"].forEach((btnLabel, btnIdx) => {
          const btn = frame({
            name: btnLabel,
            dir: "HORIZONTAL",
            bg: "#252529",
            w: 88, h: 28,
            wFixed: true, hFixed: true,
            r: 6,
            ai: "CENTER", jc: "CENTER"
          });
          const btnText = txt(btnLabel, 11, "Regular", "#ffffff");
          btn.appendChild(btnText);
          actionsFrame.appendChild(btn);
        });

        vagaCard.appendChild(actionsFrame);

        row.appendChild(vagaCard);
      }

      CARDS_GRID.appendChild(row);
    }

    CONTENT.appendChild(CARDS_GRID);
    MAIN.appendChild(CONTENT);
    ROOT.appendChild(MAIN);

    figma.currentPage.appendChild(ROOT);
    console.log("✅ Dashboard V9 Final criado com sucesso!");

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
            print("✅ Dashboard V9 Final enviado!")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if inject() else 1)

