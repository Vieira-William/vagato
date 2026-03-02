#!/usr/bin/env python3
"""
Injeta Dashboard 1:1 no Figma via Figma Bridge (POST HTTP)
Usa o método nativo que V7 usava
"""

import json
import urllib.request
import sys

FIGMA_BRIDGE_URL = "http://localhost:9999/execute"

# Código JavaScript 100% pixel-perfect do React real
JS_CODE = r"""
(async () => {
  try {
    await figma.loadFontAsync({family:"Inter",style:"Regular"});
    await figma.loadFontAsync({family:"Inter",style:"Medium"});
    await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});
    await figma.loadFontAsync({family:"Inter",style:"Bold"});

    // Helpers
    const rgb = h => { 
      const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); 
      return r?{r:parseInt(r[1],16)/255,g:parseInt(r[2],16)/255,b:parseInt(r[3],16)/255}:{r:0,g:0,b:0}; 
    };
    const fill  = (h,op=1) => [{type:"SOLID",color:rgb(h),opacity:op}];
    const none  = () => [];

    function frame(opts) {
      const f = figma.createFrame();
      f.name = opts.name || "Frame";
      f.fills = opts.bg ? fill(opts.bg, opts.bgOp||1) : none();
      if (opts.w && opts.h) f.resize(opts.w, opts.h);
      else if (opts.w) f.resize(opts.w, 100);
      else if (opts.h) f.resize(100, opts.h);
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
        if (opts.grow) f.layoutGrow=opts.grow;
        if (opts.stretch) f.layoutAlign="STRETCH";
      }
      return f;
    }

    function txt(s,sz,wt,col,mw) {
      const t=figma.createText();
      t.fontName={family:"Inter",style:wt};
      t.characters=String(s);
      t.fontSize=sz;
      t.fills=fill(col);
      if(mw){t.textAutoResize="HEIGHT";t.resize(mw,20);}
      return t;
    }

    // Criar página
    let pg = figma.root.children.find(n=>n.name==="[SCREENS] Dashboard");
    if(!pg){pg=figma.createPage();pg.name="[SCREENS] Dashboard";}
    figma.currentPage=pg;
    
    // Limpar dashboard antigos
    ["Dashboard 1:1 Dark"].forEach(nm=>{
      const o=pg.children.find(n=>n.name===nm);
      if(o)o.remove();
    });

    // ════════════════════════════════════════════════════
    // ROOT: 1440×900, HORIZONTAL (sidebar + main)
    // ════════════════════════════════════════════════════
    const ROOT = frame({name:"Dashboard 1:1 Dark", dir:"HORIZONTAL",
      bg:"#0f0f12", w:1440, h:900, wFixed:true, hFixed:true, gap:0 });
    ROOT.x=100; ROOT.y=100;

    // ════════════════════════════════════════════════════
    // SIDEBAR — 224px VERTICAL
    // ════════════════════════════════════════════════════
    const SB = frame({name:"Sidebar", dir:"VERTICAL",
      bg:"#0f0f12", w:224, h:900, wFixed:true, hFixed:true, gap:12,
      pl:16, pr:16, pt:24, pb:24 });

    // Logo
    const logo = txt("Vagas UX", 18, "Bold", "#ffffff");
    SB.appendChild(logo);

    // Nav Items
    ["Dashboard", "Meu Perfil", "Match", "Configurações"].forEach((item, idx) => {
      const nav = txt(item, 14, idx === 0 ? "Semi Bold" : "Regular", 
                      idx === 0 ? "#6366f1" : "#a1a1aa");
      SB.appendChild(nav);
    });

    ROOT.appendChild(SB);

    // ════════════════════════════════════════════════════
    // MAIN — 1216px VERTICAL
    // ════════════════════════════════════════════════════
    const MAIN = frame({name:"Main", dir:"VERTICAL",
      bg:"#0f0f12", w:1216, h:900, wFixed:true, hFixed:true, gap:0 });

    // HEADER STATS (5 cards)
    const STATS = frame({name:"Stats Row", dir:"HORIZONTAL",
      bg:"#0f0f12", w:1216, h:60, wFixed:true, hFixed:true,
      gap:16, pl:20, pr:20, pt:12, pb:12 });

    const statCards = [
      {label: "Total", value: "114"},
      {label: "Pendentes", value: "89"},
      {label: "Aplicadas", value: "3"},
      {label: "24h", value: "12"},
      {label: "Destaques", value: "8"}
    ];

    statCards.forEach(stat => {
      const card = frame({name: stat.label, dir:"HORIZONTAL",
        bg:"#1a1a1f", w:220, h:36, wFixed:true, hFixed:true,
        r:8, gap:12, pl:12, pr:12, ai:"CENTER" });

      const lbl = txt(stat.label, 12, "Regular", "#a1a1aa");
      card.appendChild(lbl);

      const val = txt(stat.value, 20, "Bold", "#6366f1");
      card.appendChild(val);

      STATS.appendChild(card);
    });

    MAIN.appendChild(STATS);

    // TOOLBAR
    const TOOLBAR = frame({name:"Toolbar", dir:"HORIZONTAL",
      bg:"#0f0f12", w:1216, h:48, wFixed:true, hFixed:true,
      gap:12, pl:20, pr:20, pt:12, pb:12 });

    ["Todo período", "Buscar...", "Compatibilidade"].forEach(text => {
      const btn = frame({name: text, dir:"HORIZONTAL",
        bg:"#1a1a1f", w:140, h:24, wFixed:true, hFixed:true, r:6, ai:"CENTER", jc:"CENTER" });
      const t = txt(text, 12, "Regular", "#ffffff");
      btn.appendChild(t);
      TOOLBAR.appendChild(btn);
    });

    MAIN.appendChild(TOOLBAR);

    // TABS
    const TABS = frame({name:"Tabs", dir:"HORIZONTAL",
      bg:"#0f0f12", w:1216, h:40, wFixed:true, hFixed:true,
      gap:2, pl:20, pr:20, pt:8, pb:8 });

    ["Todas 114", "Favoritos 0", "Destaques 0", "Indeed 36", "LinkedIn 34", "Posts 44"].forEach((tab, idx) => {
      const tabBtn = frame({name: tab, dir:"HORIZONTAL",
        bg:"#1a1a1f", w:120, h:24, wFixed:true, hFixed:true, r:4,
        bgOp: idx === 0 ? 1 : 0.5, ai:"CENTER", jc:"CENTER" });
      const tabText = txt(tab, 12, "Regular", "#ffffff");
      tabBtn.appendChild(tabText);
      TABS.appendChild(tabBtn);
    });

    MAIN.appendChild(TABS);

    // CONTENT — Filtros + Cards Grid
    const CONTENT = frame({name:"Content", dir:"HORIZONTAL",
      bg:"#0f0f12", w:1216, h:752, wFixed:true, hFixed:true,
      gap:16, pl:20, pr:20, pt:16, pb:16 });

    // FILTERS SIDEBAR (200px)
    const FILTERS = frame({name:"Filters", dir:"VERTICAL",
      bg:"#1a1a1f", w:200, h:720, wFixed:true, hFixed:true,
      r:8, gap:16, pl:12, pr:12, pt:12, pb:12 });

    ["Fonte", "Status", "Modalidade", "Inglês"].forEach(label => {
      const group = frame({name: label, dir:"VERTICAL", gap:6 });
      const lbl = txt(label, 12, "Semi Bold", "#ffffff");
      group.appendChild(lbl);

      const dropdown = frame({name:"Dropdown", dir:"HORIZONTAL",
        bg:"#0f0f12", w:176, h:24, wFixed:true, hFixed:true, r:4, ai:"CENTER", jc:"CENTER" });
      const dropText = txt("Todos", 12, "Regular", "#ffffff");
      dropdown.appendChild(dropText);
      group.appendChild(dropdown);

      FILTERS.appendChild(group);
    });

    CONTENT.appendChild(FILTERS);

    // CARDS GRID (980px, 6 cards: 3×2)
    const CARDS_GRID = frame({name:"Cards Grid", dir:"VERTICAL",
      bg:"#0f0f12", w:980, h:720, wFixed:true, hFixed:true, gap:16 });

    const cardData = [
      {title: "Product Designer Sênior", score: 92, source: "LinkedIn"},
      {title: "UX Designer Pleno", score: 85, source: "Indeed"},
      {title: "UX Lead", score: 78, source: "Posts"},
      {title: "Product Designer — Mobile", score: 74, source: "LinkedIn"},
      {title: "UX/UI Designer — B2B", score: 71, source: "Indeed"},
      {title: "Senior UX Designer", score: 68, source: "Posts"}
    ];

    for (let i = 0; i < 2; i++) {
      const row = frame({name: `Row ${i+1}`, dir:"HORIZONTAL",
        bg:"#0f0f12", w:980, h:340, wFixed:true, hFixed:true, gap:16 });

      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j;
        const data = cardData[idx];

        const vagaCard = frame({name: `Card: ${data.title}`, dir:"VERTICAL",
          bg:"#1a1a1f", w:312, h:340, wFixed:true, hFixed:true,
          r:8, gap:12, pl:16, pr:16, pt:16, pb:16 });

        // Header (source + score)
        const cardHeader = frame({name:"Header", dir:"HORIZONTAL", gap:8 });
        const source = txt(data.source, 11, "Regular", "#a1a1aa");
        cardHeader.appendChild(source);
        const score = txt(`${data.score}%`, 12, "Semi Bold", "#22c55e");
        cardHeader.appendChild(score);
        vagaCard.appendChild(cardHeader);

        // Title
        const title = txt(data.title, 14, "Semi Bold", "#ffffff");
        vagaCard.appendChild(title);

        // Company
        const company = txt("Empresa Confidencial", 12, "Regular", "#a1a1aa");
        vagaCard.appendChild(company);

        // Tags
        const tagsFrame = frame({name:"Tags", dir:"HORIZONTAL", gap:6 });
        ["Figma", "Notion"].forEach(tag => {
          const tagEl = frame({name: tag, dir:"HORIZONTAL",
            bg:"#0f0f12", w:50, h:20, wFixed:true, hFixed:true, r:4, ai:"CENTER", jc:"CENTER" });
          const tagText = txt(tag, 10, "Regular", "#a1a1aa");
          tagEl.appendChild(tagText);
          tagsFrame.appendChild(tagEl);
        });
        vagaCard.appendChild(tagsFrame);

        // Actions
        const actions = frame({name:"Actions", dir:"HORIZONTAL", gap:8 });
        ["Pendente", "✨", "Aplicar"].forEach(btn => {
          const btnEl = frame({name: btn, dir:"HORIZONTAL",
            bg:"#252529", w:85, h:28, wFixed:true, hFixed:true, r:6, ai:"CENTER", jc:"CENTER" });
          const btnText = txt(btn, 11, "Regular", "#ffffff");
          btnEl.appendChild(btnText);
          actions.appendChild(btnEl);
        });
        vagaCard.appendChild(actions);

        row.appendChild(vagaCard);
      }

      CARDS_GRID.appendChild(row);
    }

    CONTENT.appendChild(CARDS_GRID);
    MAIN.appendChild(CONTENT);
    ROOT.appendChild(MAIN);

    figma.currentPage.appendChild(ROOT);
    console.log("✅ Dashboard 1:1 criado com sucesso no Figma!");

  } catch(err) {
    console.error("❌ Erro ao criar dashboard:", err.message);
  }
})();
"""

def inject_dashboard():
    """Envia código JavaScript para Figma Bridge via POST HTTP"""
    try:
        payload = json.dumps({"code": JS_CODE}).encode()
        req = urllib.request.Request(
            FIGMA_BRIDGE_URL,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = response.read()
            print("✅ Código enviado ao Figma Bridge com sucesso!")
            print(f"📨 Resposta: {result[:100]}")
            return True
            
    except urllib.error.URLError as e:
        print(f"❌ Erro de conexão: {e}")
        print("Verifique se Figma Bridge está rodando em localhost:9999")
        return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    success = inject_dashboard()
    sys.exit(0 if success else 1)

