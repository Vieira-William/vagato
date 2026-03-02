#!/usr/bin/env python3
"""
Master Components Library 1:1 - Pixel Perfect
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

    function createNode(opts, isComponent=false) {
      const f = isComponent ? figma.createComponent() : figma.createFrame();
      f.name = opts.name || (isComponent ? "Component" : "Frame");
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
    
    const frame = opts => createNode(opts, false);
    const component = opts => createNode(opts, true);

    function txt(s, sz, wt, col) {
      const t = figma.createText();
      t.fontName = {family:"Inter", style:wt};
      t.characters = String(s);
      t.fontSize = sz;
      t.fills = fill(col);
      return t;
    }

    // Limpar e criar página
    let pg = figma.root.children.find(n => n.name === "[LIBRARY] Componentes");
    if(!pg) { pg = figma.createPage(); pg.name = "[LIBRARY] Componentes"; }
    figma.currentPage = pg;
    
    pg.children.forEach(n => { n.remove(); });

    // ROOT: 1440×1200
    const ROOT = frame({
      name: "Design System & Components", 
      dir: "VERTICAL",
      bg: "#0f0f12", 
      w: 1440, h: 1200, 
      wFixed: true, hFixed: false, 
      gap: 48,
      pl: 64, pr: 64, pt: 64, pb: 64
    });
    ROOT.x = 0; ROOT.y = 0;

    const titleInfo = frame({ name: "Header", dir: "VERTICAL", gap: 16 });
    titleInfo.appendChild(txt("Vagas UX — Component Library", 32, "Bold", "#ffffff"));
    titleInfo.appendChild(txt("Componentes atômicos e moleculares usados em toda a aplicação.", 16, "Regular", "#a1a1aa"));
    ROOT.appendChild(titleInfo);

    const libContainer = frame({
      name: "Library Content",
      dir: "HORIZONTAL",
      gap: 128,
      ai: "MIN"
    });

    const colLeft = frame({ name: "Atomics", dir: "VERTICAL", gap: 48 });
    const colRight = frame({ name: "Molecules", dir: "VERTICAL", gap: 48 });
    
    libContainer.appendChild(colLeft);
    libContainer.appendChild(colRight);
    ROOT.appendChild(libContainer);

    // ================= BUTTONS =================
    const btnSection = frame({ name: "Section: Buttons", dir: "VERTICAL", gap: 16 });
    btnSection.appendChild(txt("Botões", 20, "Semi Bold", "#ffffff"));
    
    const btnRow = frame({ name: "Row", dir: "HORIZONTAL", gap: 16 });
    
    // Primary Btn Component
    const btnPrimary = component({
      name: "Button / Primary", dir: "HORIZONTAL", bg: "#6366f1", r: 6,
      pl: 16, pr: 16, pt: 8, pb: 8, ai: "CENTER", jc: "CENTER"
    });
    btnPrimary.appendChild(txt("Aplicar Agora", 12, "Semi Bold", "#ffffff"));
    btnRow.appendChild(btnPrimary);

    // Secondary Btn Component
    const btnSec = component({
      name: "Button / Secondary", dir: "HORIZONTAL", bg: "#252529", r: 6,
      pl: 16, pr: 16, pt: 8, pb: 8, ai: "CENTER", jc: "CENTER"
    });
    btnSec.appendChild(txt("Favoritar Vaga", 12, "Semi Bold", "#ffffff"));
    btnRow.appendChild(btnSec);

    btnSection.appendChild(btnRow);
    colLeft.appendChild(btnSection);

    // ================= LABELS & BADGES =================
    const badgeSection = frame({ name: "Section: Badges", dir: "VERTICAL", gap: 16 });
    badgeSection.appendChild(txt("Badges & Pills", 20, "Semi Bold", "#ffffff"));
    
    const badgeRow = frame({ name: "Row", dir: "HORIZONTAL", gap: 16 });

    // Badge Component - Fonte
    const badgeFonte = component({
      name: "Badge / Source", dir: "HORIZONTAL", bg: "#1a1a1f", stroke: "#2e2e33", sw: 1, r: 4,
      pl: 8, pr: 8, pt: 2, pb: 2, ai: "CENTER", jc: "CENTER"
    });
    badgeFonte.appendChild(txt("LinkedIn", 10, "Regular", "#a1a1aa"));
    badgeRow.appendChild(badgeFonte);

    // Badge Component - Score
    const badgeScore = component({
      name: "Badge / Score", dir: "HORIZONTAL", bg: "#22c55e", bgOp: 0.15, r: 4,
      pl: 8, pr: 8, pt: 2, pb: 2, ai: "CENTER", jc: "CENTER"
    });
    badgeScore.appendChild(txt("95%", 11, "Semi Bold", "#22c55e"));
    badgeRow.appendChild(badgeScore);

    badgeSection.appendChild(badgeRow);
    colLeft.appendChild(badgeSection);
    
    // ================= SIDEBAR NAV ITEM =================
    const navItemSection = frame({ name: "Section: NavItem", dir: "VERTICAL", gap: 16 });
    navItemSection.appendChild(txt("Sidebar Nav Item", 20, "Semi Bold", "#ffffff"));
    
    const navItemActive = component({
      name: "NavItem / Active", dir: "HORIZONTAL", bg: "#6366f1", r: 8, gap: 12,
      w: 192, h: 40, wFixed: true, hFixed: true, pl: 12, pr: 12, pt: 8, pb: 8, ai: "CENTER"
    });
    const ic1 = frame({name: "Icon", w:20, h:20, wFixed:true, hFixed:true, bg:"#ffffff", r:4, bgOp:0.8});
    navItemActive.appendChild(ic1);
    navItemActive.appendChild(txt("Dashboard", 14, "Semi Bold", "#ffffff"));
    navItemSection.appendChild(navItemActive);

    const navItemDefault = component({
      name: "NavItem / Default", dir: "HORIZONTAL", bg: "#0f0f12", r: 8, gap: 12,
      w: 192, h: 40, wFixed: true, hFixed: true, pl: 12, pr: 12, pt: 8, pb: 8, ai: "CENTER"
    });
    const ic2 = frame({name: "Icon", w:20, h:20, wFixed:true, hFixed:true, bg:"#a1a1aa", r:4, bgOp:0.8});
    navItemDefault.appendChild(ic2);
    navItemDefault.appendChild(txt("Match", 14, "Regular", "#a1a1aa"));
    navItemSection.appendChild(navItemDefault);
    
    colLeft.appendChild(navItemSection);

    // ================= VAGA CARD =================
    const cardSection = frame({ name: "Section: VagaCard", dir: "VERTICAL", gap: 16 });
    cardSection.appendChild(txt("Master: Card de Vaga", 20, "Semi Bold", "#ffffff"));

    const vagaCard = component({
      name: "VagaCard",
      dir: "VERTICAL",
      bg: "#1a1a1f",
      w: 312, h: 340,
      wFixed: true, hFixed: true,
      r: 8, gap: 12,
      pl: 16, pr: 16, pt: 16, pb: 16
    });

    // Card Header (source + score)
    const cardHeader = frame({
      name: "Header", dir: "HORIZONTAL", w: 280, h: 20, wFixed: true, hFixed: true, gap: 8
    });
    cardHeader.appendChild(txt("LinkedIn", 10, "Regular", "#a1a1aa"));
    cardHeader.appendChild(txt("92%", 11, "Semi Bold", "#22c55e"));
    vagaCard.appendChild(cardHeader);

    vagaCard.appendChild(txt("Product Designer Sênior — Design System", 13, "Semi Bold", "#ffffff"));
    vagaCard.appendChild(txt("Empresa Confidencial", 11, "Regular", "#a1a1aa"));

    const tagsFrame = frame({
      name: "Tags", dir: "HORIZONTAL", w: 280, h: 20, wFixed: true, hFixed: true, gap: 6
    });
    ["Figma", "UI/UX"].forEach(t => {
      const tg = frame({ name: "Tag", dir: "HORIZONTAL", bg: "#252529", w: 50, h: 20, wFixed: true, hFixed: true, r: 4, ai: "CENTER", jc: "CENTER" });
      tg.appendChild(txt(t, 10, "Regular", "#a1a1aa"));
      tagsFrame.appendChild(tg);
    });
    vagaCard.appendChild(tagsFrame);

    const actionsFrame = frame({
      name: "Actions", dir: "HORIZONTAL", w: 280, h: 28, wFixed: true, hFixed: true, gap: 6
    });
    ["Pendente", "✨", "Aplicar"].forEach(btnLabel => {
      const btn = frame({
        name: btnLabel, dir: "HORIZONTAL", bg: "#252529", w: 88, h: 28, wFixed: true, hFixed: true, r: 6, ai: "CENTER", jc: "CENTER"
      });
      btn.appendChild(txt(btnLabel, 11, "Regular", "#ffffff"));
      actionsFrame.appendChild(btn);
    });
    vagaCard.appendChild(actionsFrame);

    cardSection.appendChild(vagaCard);
    colRight.appendChild(cardSection);


    // ================= STAT CARD =================
    const statSection = frame({ name: "Section: StatCard", dir: "VERTICAL", gap: 16 });
    statSection.appendChild(txt("Master: Stat Card (Header)", 20, "Semi Bold", "#ffffff"));
    
    const statCard = component({
      name: "StatCard",
      dir: "HORIZONTAL",
      bg: "#1a1a1f",
      w: 220, h: 36,
      wFixed: true, hFixed: true,
      r: 8, gap: 8,
      pl: 12, pr: 12, ai: "CENTER"
    });
    statCard.appendChild(txt("Total Vagas", 11, "Regular", "#a1a1aa"));
    statCard.appendChild(txt("114", 18, "Bold", "#6366f1"));
    
    statSection.appendChild(statCard);
    colRight.appendChild(statSection);

    figma.currentPage.appendChild(ROOT);
    console.log("✅ Components Library criado com sucesso!");

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
            print("✅ Components Library Final enviado!")
            return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if inject() else 1)
