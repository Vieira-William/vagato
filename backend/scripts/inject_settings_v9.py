#!/usr/bin/env python3
"""
Settings Screen 1:1 - Pixel Perfect
Injeção no Figma Desktop
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
    let pg = figma.root.children.find(n => n.name === "[SCREENS] Configuracoes");
    if(!pg) { pg = figma.createPage(); pg.name = "[SCREENS] Configuracoes"; }
    figma.currentPage = pg;
    pg.children.forEach(n => { n.remove(); });

    // ROOT: 1440×900
    const ROOT = frame({
      name: "Settings Page", 
      dir: "HORIZONTAL",
      bg: "#0f0f12", 
      w: 1440, h: 900, 
      wFixed: true, hFixed: true, 
      gap: 0
    });
    ROOT.x = 0; ROOT.y = 0;

    // SIDEBAR (224px × 900)
    const SIDEBAR = frame({
      name: "Sidebar", dir: "VERTICAL", bg: "#0f0f12", w: 224, h: 900,
      wFixed: true, hFixed: true, gap: 16, pl: 16, pr: 16, pt: 24, pb: 24
    });
    SIDEBAR.appendChild(txt("Vagas UX", 18, "Bold", "#ffffff"));
    const navItems = ["Dashboard", "Meu Perfil", "Match", "Configurações"];
    navItems.forEach((item, idx) => {
      SIDEBAR.appendChild(txt(item, 14, idx === 3 ? "Semi Bold" : "Regular", idx === 3 ? "#6366f1" : "#a1a1aa"));
    });
    ROOT.appendChild(SIDEBAR);

    // MAIN
    const MAIN = frame({
      name: "Main", dir: "VERTICAL", bg: "#0f0f12", w: 1216, h: 900,
      wFixed: true, hFixed: true, gap: 24, pl: 32, pr: 32, pt: 32, pb: 32
    });

    const header = frame({name: "Header", dir: "VERTICAL", gap: 4});
    header.appendChild(txt("Configurações", 24, "Bold", "#ffffff"));
    header.appendChild(txt("Configure credenciais, URLs de busca e Consumo de IA", 14, "Regular", "#a1a1aa"));
    MAIN.appendChild(header);

    const cardsContainer = frame({name: "Cards", dir: "HORIZONTAL", gap: 24});
    
    // COL 1
    const col1 = frame({name: "Col 1", dir: "VERTICAL", w: 560, wFixed: true, gap: 24});

    // Linkedin Card
    const cardLi = frame({name: "LinkedIn Card", dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", r: 12, gap: 24, pl:24, pr:24, pt:24, pb:24});
    const liHeader = frame({name: "LI Header", dir:"HORIZONTAL", gap: 12, ai: "CENTER"});
    const liIcon = frame({name: "Icon", w:40, h:40, bg: "#0A66C2", r: 8, wFixed:true, hFixed:true});
    liHeader.appendChild(liIcon);
    const liTitleGroup = frame({name: "Title", dir: "VERTICAL", gap: 2});
    liTitleGroup.appendChild(txt("LinkedIn", 16, "Semi Bold", "#ffffff"));
    liTitleGroup.appendChild(txt("Credenciais para coletar vagas", 12, "Regular", "#a1a1aa"));
    liHeader.appendChild(liTitleGroup);
    cardLi.appendChild(liHeader);

    const liForm = frame({name: "Form", dir: "HORIZONTAL", gap: 16});
    const inputE = frame({name: "Email Input", w:240, h:36, bg: "#252529", stroke: "#2e2e33", r:6, wFixed:true, hFixed:true, pl:12, pb:10, pt:10, ai:"CENTER"});
    inputE.appendChild(txt("seu.email@exemplo.com", 12, "Regular", "#a1a1aa"));
    liForm.appendChild(inputE);

    const inputP = frame({name: "Pass Input", w:240, h:36, bg: "#252529", stroke: "#2e2e33", r:6, wFixed:true, hFixed:true, pl:12, pb:10, pt:10, ai:"CENTER"});
    inputP.appendChild(txt("••••••••", 12, "Regular", "#a1a1aa"));
    liForm.appendChild(inputP);

    cardLi.appendChild(liForm);
    
    const liBtnSet = frame({name: "Btns", dir: "HORIZONTAL", gap: 12});
    const liBtnPrimary = frame({name: "Save", w: 100, h: 36, bg: "#6366f1", r:6, wFixed:true, hFixed:true, ai:"CENTER", jc:"CENTER"});
    liBtnPrimary.appendChild(txt("Salvar", 12, "Semi Bold", "#ffffff"));
    liBtnSet.appendChild(liBtnPrimary);
    
    const liBtnTest = frame({name: "Test", w: 100, h: 36, bg: "#0A66C2", r:6, wFixed:true, hFixed:true, ai:"CENTER", jc:"CENTER"});
    liBtnTest.appendChild(txt("Testar", 12, "Semi Bold", "#ffffff"));
    liBtnSet.appendChild(liBtnTest);
    
    cardLi.appendChild(liBtnSet);
    col1.appendChild(cardLi);


    // URLs Card
    const cardUrls = frame({name: "URLs Card", dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", r: 12, gap: 16, pl:24, pr:24, pt:24, pb:24});
    const urlsHeader = frame({name: "URLs Header", dir:"HORIZONTAL", gap: 12, ai: "CENTER"});
    const urlsIcon = frame({name: "Icon", w:40, h:40, bg: "#6366f1", bgOp: 0.1, r: 8, wFixed:true, hFixed:true});
    urlsHeader.appendChild(urlsIcon);
    const urlsTitleGroup = frame({name: "Title", dir: "VERTICAL", gap: 2});
    urlsTitleGroup.appendChild(txt("URLs de Busca", 16, "Semi Bold", "#ffffff"));
    urlsTitleGroup.appendChild(txt("Configure as fontes de vagas", 12, "Regular", "#a1a1aa"));
    urlsHeader.appendChild(urlsTitleGroup);
    cardUrls.appendChild(urlsHeader);

    // List of URLs
    const urlsList = frame({name: "List", dir: "VERTICAL", gap: 8, w: 512, wFixed: true});
    ["Busca Designer Sênior Remoto", "Pesquisa UX Brasil"].forEach(n => {
      const uItem = frame({name: "Item", dir: "VERTICAL", bg: "#252529", stroke: "#2e2e33", r: 8, gap: 4, pl:12, pr:12, pt:12, pb:12, w: 512, wFixed: true});
      uItem.appendChild(txt(n, 12, "Semi Bold", "#ffffff"));
      uItem.appendChild(txt("https://www.linkedin.com/jobs/search/?...", 10, "Regular", "#a1a1aa"));
      urlsList.appendChild(uItem);
    });
    cardUrls.appendChild(urlsList);
    col1.appendChild(cardUrls);
    
    cardsContainer.appendChild(col1);

    // COL 2
    const col2 = frame({name: "Col 2", dir: "VERTICAL", w: 560, wFixed: true, gap: 24});

    // AI Consumption Card
    const cardIa = frame({name: "IA Card", dir: "VERTICAL", bg: "#1a1a1f", stroke: "#2e2e33", r: 12, gap: 24, pl:24, pr:24, pt:24, pb:24});
    const iaHeader = frame({name: "IA Header", dir:"HORIZONTAL", gap: 12, ai: "CENTER"});
    const iaIcon = frame({name: "Icon", w:40, h:40, bg: "#f97316", bgOp: 0.1, r: 8, wFixed:true, hFixed:true});
    iaHeader.appendChild(iaIcon);
    const iaTitleGroup = frame({name: "Title", dir: "VERTICAL", gap: 2});
    iaTitleGroup.appendChild(txt("Consumo de IA", 16, "Semi Bold", "#ffffff"));
    iaTitleGroup.appendChild(txt("Monitoramento de créditos Anthropic", 12, "Regular", "#a1a1aa"));
    iaHeader.appendChild(iaTitleGroup);
    cardIa.appendChild(iaHeader);

    const balanceBlock = frame({name: "Balance", dir: "HORIZONTAL", gap: 100, ai: "CENTER"});
    // space-between mock via jc
    const bLeft = frame({name: "L", dir: "VERTICAL", gap: 2});
    bLeft.appendChild(txt("SALDO DISPONÍVEL", 10, "Bold", "#a1a1aa"));
    bLeft.appendChild(txt("$ 4.82", 24, "Bold", "#22c55e"));
    const bRight = frame({name: "R", dir: "VERTICAL", gap: 2, ai:"max"});
    bRight.appendChild(txt("PERCENTUAL", 10, "Bold", "#a1a1aa"));
    bRight.appendChild(txt("48.2%", 24, "Bold", "#ffffff"));
    balanceBlock.appendChild(bLeft);
    balanceBlock.appendChild(bRight);
    
    // progress bar mock
    const progBarCont = frame({name: "ProgCont", bg: "#252529", w: 512, h: 16, wFixed:true, hFixed:true, r:8, stroke:"#2e2e33"});
    const progBar = frame({name: "ProgFill", bg: "#f97316", w: 240, h: 16, wFixed:true, hFixed:true, r:8});
    progBarCont.appendChild(progBar);
    
    cardIa.appendChild(balanceBlock);
    cardIa.appendChild(progBarCont);
    
    col2.appendChild(cardIa);

    cardsContainer.appendChild(col2);

    MAIN.appendChild(cardsContainer);
    ROOT.appendChild(MAIN);

    figma.currentPage.appendChild(ROOT);
    console.log("✅ Settings Screen final criado com sucesso!");

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
            print("✅ Screen Settings Final enviado!")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if inject() else 1)
