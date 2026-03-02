import json, urllib.request

def send(js):
    req = urllib.request.Request('http://localhost:9999/execute',
        data=json.dumps({"code": js}).encode(), headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req) as r: r.read()

JS = r"""
(async () => {
try {
  await figma.loadFontAsync({family:"Inter",style:"Regular"});
  await figma.loadFontAsync({family:"Inter",style:"Medium"});
  await figma.loadFontAsync({family:"Inter",style:"Semi Bold"});
  await figma.loadFontAsync({family:"Inter",style:"Bold"});

  // ── HELPERS ──────────────────────────────────────────
  const rgb = h => { const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r?{r:parseInt(r[1],16)/255,g:parseInt(r[2],16)/255,b:parseInt(r[3],16)/255}:{r:0,g:0,b:0}; };
  const fill  = (h,op=1) => [{type:"SOLID",color:rgb(h),opacity:op}];
  const none  = () => [];

  // Auto-layout frame com todas as opções
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
      f.layoutMode = opts.dir; // "HORIZONTAL"|"VERTICAL"
      f.primaryAxisSizingMode = opts.wFixed ? "FIXED" : "AUTO";
      f.counterAxisSizingMode = opts.hFixed ? "FIXED" : "AUTO";
      if (opts.gap!==undefined) f.itemSpacing = opts.gap;
      if (opts.pl!==undefined) f.paddingLeft=opts.pl;
      if (opts.pr!==undefined) f.paddingRight=opts.pr;
      if (opts.pt!==undefined) f.paddingTop=opts.pt;
      if (opts.pb!==undefined) f.paddingBottom=opts.pb;
      if (opts.jc) f.primaryAxisAlignItems=opts.jc;   // justify-content
      if (opts.ai) f.counterAxisAlignItems=opts.ai;    // align-items
      if (opts.grow) f.layoutGrow=opts.grow;
      if (opts.stretch) f.layoutAlign="STRETCH";
    }
    return f;
  }

  // Texto
  function txt(s,sz,wt,col,mw) {
    const t=figma.createText();
    t.fontName={family:"Inter",style:wt};
    t.characters=String(s);
    t.fontSize=sz;
    t.fills=fill(col);
    if(mw){t.textAutoResize="HEIGHT";t.resize(mw,20);}
    return t;
  }

  // Ícone placeholder (quadrado/círculo colorido representando Lucide icon)
  function icon(sz,col,shape="sq") {
    const f=figma.createFrame();
    f.resize(sz,sz);
    f.fills=fill(col,0.85);
    f.cornerRadius = shape==="circle" ? sz/2 : Math.round(sz*0.2);
    f.name="Icon";
    return f;
  }

  // Separador horizontal
  function divH(w) {
    const f=figma.createFrame(); f.resize(w,1); f.fills=fill("#2e2e33"); f.name="Divider"; return f;
  }

  // ── PAGE ─────────────────────────────────────────────
  let pg = figma.root.children.find(n=>n.name==="[SYSTEM] Design System");
  if(!pg){pg=figma.createPage();pg.name="[SYSTEM] Design System";}
  figma.currentPage=pg;
  ["💻 Dashboard V6","💻 Dashboard V7"].forEach(nm=>{const o=pg.children.find(n=>n.name===nm);if(o)o.remove();});

  // ════════════════════════════════════════════════════
  // ROOT: 1440×900, HORIZONTAL (sidebar + main)
  // ════════════════════════════════════════════════════
  const ROOT = frame({name:"💻 Dashboard V7", dir:"HORIZONTAL",
    bg:"#0f0f12", w:1440, h:900, wFixed:true, hFixed:true, gap:0 });
  ROOT.x=3400; ROOT.y=0;

  // ════════════════════════════════════════════════════
  // SIDEBAR — w-56 (224px), VERTICAL
  // Sidebar.jsx: bg-secondary, border-r
  // ════════════════════════════════════════════════════
  const SB = frame({name:"Sidebar", dir:"VERTICAL",
    bg:"#1a1a1f", w:224, h:900, wFixed:true, hFixed:true, gap:0,
    stroke:"#2e2e33" });

  // Sidebar Logo Header — h-16 (64px) px-3 border-b
  const sbH = frame({name:"SB Header", dir:"HORIZONTAL",
    bg:"#1a1a1f", w:224, h:64, wFixed:true, hFixed:true,
    pl:12, pr:12, gap:12, ai:"CENTER", jc:"SPACE_BETWEEN",
    stroke:"#2e2e33" });
  const logoRow = frame({dir:"HORIZONTAL", gap:10, ai:"CENTER"});
  const logoBg = frame({bg:"#6366f1", r:8, w:32, h:32, dir:"HORIZONTAL", ai:"CENTER", jc:"CENTER"});
  logoBg.appendChild(icon(18,"#ffffff","sq")); // Target icon
  logoRow.appendChild(logoBg);
  logoRow.appendChild(txt("Vagas UX",14,"Bold","#ffffff"));
  sbH.appendChild(logoRow);
  sbH.appendChild(frame({bg:"#252529",r:6,w:28,h:28})); // collapse btn
  SB.appendChild(sbH);

  // Nav area — flex-1 py-4 px-2, space-y-1
  const navArea = frame({name:"Nav", dir:"VERTICAL", pt:16,pb:16,pl:8,pr:8, gap:4, wFixed:true, hFixed:false});
  navArea.layoutGrow=1; navArea.fills=none();
  const navDefs=[
    {l:"Dashboard",    active:true},
    {l:"Meu Perfil",   active:false},
    {l:"Match",        active:false},
    {l:"Configurações",active:false},
  ];
  navDefs.forEach(nd=>{
    const row=frame({dir:"HORIZONTAL", gap:12, pl:12,pr:12,pt:10,pb:10, r:8,
      w:208, h:40, wFixed:true, hFixed:true, ai:"CENTER"});
    row.fills = nd.active ? fill("#6366f1") : none();
    row.appendChild(icon(18, nd.active?"#ffffff":"#a1a1aa","sq"));
    row.appendChild(txt(nd.l,14,nd.active?"Semi Bold":"Medium", nd.active?"#ffffff":"#a1a1aa"));
    navArea.appendChild(row);
  });
  SB.appendChild(navArea);

  // Bottom — p-2 border-t
  const sbBot = frame({name:"SB Bottom", dir:"VERTICAL",
    bg:"#1a1a1f", w:224, h:52, wFixed:true, hFixed:true, pl:8,pr:8,pt:8,pb:8,
    stroke:"#2e2e33"});
  const themeRow=frame({dir:"HORIZONTAL",gap:12,pl:12,pr:12,pt:10,pb:10,r:8,
    w:208,h:36,wFixed:true,hFixed:true,ai:"CENTER"});
  themeRow.fills=none();
  themeRow.appendChild(icon(18,"#a1a1aa","circle"));
  themeRow.appendChild(txt("Light Mode",14,"Medium","#a1a1aa"));
  sbBot.appendChild(themeRow);
  SB.appendChild(sbBot);
  ROOT.appendChild(SB);

  // ════════════════════════════════════════════════════
  // MAIN AREA — 1216×900, VERTICAL
  // ════════════════════════════════════════════════════
  const MAIN = frame({name:"Main", dir:"VERTICAL",
    bg:"#0f0f12", w:1216, h:900, wFixed:true, hFixed:true, gap:0});

  // ── HEADER — bg-secondary, border-b ─────────────────
  const HDR = frame({name:"Header", dir:"VERTICAL",
    bg:"#1a1a1f", w:1216, wFixed:true, hFixed:false, gap:0,
    stroke:"#2e2e33"});

  // [1] STATS ROW — flex gap-3 px-4 py-3 border-b — h=56px
  // StatCard: card flex-1 min-w-[160px] py-3 px-4
  //   flex items-center SPACE_BETWEEN gap-3
  //   Left: icon(p-1.5 rounded-lg bg-color/10) + title(text-xs text-secondary)
  //   Right: value(text-xl font-bold text-color)
  const STATS = frame({name:"Stats Row", dir:"HORIZONTAL",
    bg:"#1a1a1f", w:1216, h:56, wFixed:true, hFixed:true,
    pl:16, pr:16, pt:12, pb:12, gap:12, ai:"CENTER",
    stroke:"#2e2e33"});
  [
    {t:"Total",     v:"114",color:"#6366f1"},
    {t:"Pendentes", v:"89", color:"#f59e0b"},
    {t:"Aplicadas", v:"3",  color:"#22c55e"},
    {t:"24h",       v:"12", color:"#06b6d4"},
    {t:"Destaques", v:"8",  color:"#22c55e"},
  ].forEach(sd=>{
    // card: bg-secondary border rounded-2xl py-3 px-4 flex-1
    const card=frame({dir:"HORIZONTAL", bg:"#1a1a1f", r:16,
      pl:16,pr:16,pt:12,pb:12, gap:12, ai:"CENTER", jc:"SPACE_BETWEEN",
      stroke:"#2e2e33"});
    card.layoutGrow=1;
    // Left: icon bg + title
    const L=frame({dir:"HORIZONTAL",gap:8,ai:"CENTER"});L.fills=none();
    const ibg=frame({bg:sd.color,bgOp:0.1,r:8,w:28,h:28,
      dir:"HORIZONTAL",ai:"CENTER",jc:"CENTER"});
    ibg.appendChild(icon(14,sd.color,"sq"));
    L.appendChild(ibg);
    L.appendChild(txt(sd.t,12,"Regular","#a1a1aa"));
    card.appendChild(L);
    card.appendChild(txt(sd.v,20,"Bold",sd.color));
    STATS.appendChild(card);
  });
  HDR.appendChild(STATS);

  // [2] TOOLBAR — flex items-center gap-3 px-4 py-2 border-b — h=36px
  const TB = frame({name:"Toolbar", dir:"HORIZONTAL",
    bg:"#1a1a1f", w:1216, h:36, wFixed:true, hFixed:true,
    pl:16,pr:16,pt:8,pb:8, gap:8, ai:"CENTER",
    stroke:"#2e2e33"});

  // Período dropdown
  const periF=frame({dir:"HORIZONTAL",bg:"#252529",r:8,pl:10,pr:10,pt:5,pb:5,gap:6,ai:"CENTER"});
  periF.appendChild(icon(13,"#71717a","sq"));
  periF.appendChild(txt("Todo período",12,"Regular","#a1a1aa"));
  periF.appendChild(icon(9,"#71717a","sq"));
  TB.appendChild(periF);

  // Search — max-w-md
  const srch=frame({dir:"HORIZONTAL",bg:"#252529",r:8,pl:28,pr:10,pt:5,pb:5,
    w:260,h:26,wFixed:true,hFixed:true,ai:"CENTER"});
  srch.appendChild(txt("Buscar...",12,"Regular","#71717a"));
  TB.appendChild(srch);

  // Ordenação
  const ordF=frame({dir:"HORIZONTAL",bg:"#252529",r:8,pl:10,pr:10,pt:5,pb:5,gap:6,ai:"CENTER"});
  ordF.appendChild(icon(13,"#71717a","sq"));
  ordF.appendChild(txt("Compatibilidade",12,"Regular","#a1a1aa"));
  ordF.appendChild(icon(9,"#71717a","sq"));
  TB.appendChild(ordF);

  // Por página: 9/12/24/48
  const ppF=frame({dir:"HORIZONTAL",bg:"#252529",r:8,pt:2,pb:2,pl:2,pr:2,gap:0});
  ["9","12","24","48"].forEach((v,i)=>{
    const b=frame({dir:"HORIZONTAL",r:6,pl:8,pr:8,pt:3,pb:3});
    b.fills=i===1?fill("#1a1a1f"):none();
    b.appendChild(txt(v,10,i===1?"Semi Bold":"Medium",i===1?"#ffffff":"#71717a"));
    ppF.appendChild(b);
  });
  TB.appendChild(ppF);

  // Grid/List toggle
  const glF=frame({dir:"HORIZONTAL",bg:"#252529",r:8,pt:2,pb:2,pl:2,pr:2,gap:0});
  const gbtn=frame({dir:"HORIZONTAL",bg:"#1a1a1f",r:6,pl:6,pr:6,pt:5,pb:5});
  gbtn.appendChild(icon(13,"#ffffff","sq"));
  const lbtn=frame({dir:"HORIZONTAL",r:6,pl:6,pr:6,pt:5,pb:5});lbtn.fills=none();
  lbtn.appendChild(icon(13,"#71717a","sq"));
  glF.appendChild(gbtn);glF.appendChild(lbtn);
  TB.appendChild(glF);

  // Spacer (ml-auto)
  const tbSp=figma.createFrame(); tbSp.resize(1,1); tbSp.fills=none(); tbSp.layoutGrow=1;
  TB.appendChild(tbSp);

  // "Atualizar Vagas" button — h-7 px-3 bg-accent-primary rounded-lg
  const atuBtn=frame({dir:"HORIZONTAL",bg:"#6366f1",r:8,pl:12,pr:12,
    w:148,h:28,wFixed:true,hFixed:true,gap:6,ai:"CENTER",jc:"CENTER"});
  atuBtn.appendChild(icon(13,"#ffffff","circle"));
  atuBtn.appendChild(txt("Atualizar Vagas",12,"Semi Bold","#ffffff"));
  TB.appendChild(atuBtn);
  HDR.appendChild(TB);

  // [3] TABS ROW — flex items-center justify-between px-4 — h=40px
  // Left: "Filtros" button | divider | tabs
  // Tabs: Todas/Favoritos/Destaques/Indeed/LinkedIn/Posts
  // Active: text-primary + bottom bar h-0.5 bg-accent-primary
  const TABS=frame({name:"Tabs Row", dir:"HORIZONTAL",
    bg:"#1a1a1f", w:1216, h:40, wFixed:true, hFixed:true,
    pl:16,pr:16, ai:"CENTER", jc:"SPACE_BETWEEN"});

  const tabsL=frame({dir:"HORIZONTAL",gap:0,ai:"CENTER"});tabsL.fills=none();

  // Filtros button — px-3 py-1.5 rounded-lg text-sm
  const filtBtn=frame({dir:"HORIZONTAL",bg:"#6366f1",bgOp:0.1,r:8,
    pl:12,pr:12,pt:6,pb:6,gap:8,ai:"CENTER"});
  filtBtn.appendChild(icon(14,"#6366f1","sq"));
  filtBtn.appendChild(txt("Filtros",14,"Medium","#6366f1"));
  tabsL.appendChild(filtBtn);

  // Divider h-5 w-px mx-3
  const dvW=frame({dir:"HORIZONTAL",pl:12,pr:12,ai:"CENTER",h:40,hFixed:true});dvW.fills=none();
  const dv=figma.createFrame();dv.resize(1,20);dv.fills=fill("#2e2e33");dvW.appendChild(dv);
  tabsL.appendChild(dvW);

  // Tabs
  [{l:"Todas",c:"114",a:true},{l:"Favoritos",c:"8",a:false},{l:"Destaques",c:"22",a:false},
   {l:"Indeed",c:"45",a:false},{l:"LinkedIn",c:"62",a:false},{l:"Posts",c:"7",a:false}
  ].forEach(tab=>{
    // px-4 py-2.5 relative — Active: text-primary + bottom indicator h-0.5
    const tF=frame({dir:"VERTICAL",h:40,hFixed:true,pl:16,pr:16,pt:0,pb:0,
      gap:0,ai:"CENTER",jc:"CENTER"});
    tF.fills=none();
    const tRow=frame({dir:"HORIZONTAL",gap:5,ai:"CENTER"});tRow.fills=none();
    tRow.appendChild(txt(tab.l,14,tab.a?"Semi Bold":"Medium",tab.a?"#ffffff":"#71717a"));
    tRow.appendChild(txt(tab.c,12,"Regular",tab.a?"#a1a1aa":"#71717a"));
    tF.appendChild(tRow);
    if(tab.a){
      const ind=figma.createFrame();
      ind.resize(60,2);ind.fills=fill("#6366f1");ind.name="Tab Indicator";
      tF.appendChild(ind);
    }
    tabsL.appendChild(tF);
  });
  TABS.appendChild(tabsL);

  // Pagination
  const pagR=frame({dir:"HORIZONTAL",gap:4,ai:"CENTER"});pagR.fills=none();
  ["«","‹","1 / 10","›","»"].forEach((v,i)=>{
    const b=frame({dir:"HORIZONTAL",r:6,pl:6,pr:6,pt:5,pb:5});b.fills=none();
    b.appendChild(txt(v,i===2?12:14,i===2?"Regular":"Medium",i===2?"#a1a1aa":"#71717a"));
    pagR.appendChild(b);
  });
  TABS.appendChild(pagR);
  HDR.appendChild(TABS);
  MAIN.appendChild(HDR);

  // ── CONTENT ROW — flex-1 overflow-hidden ────────────
  // Filter sidebar (w-56=224px) + Cards area (992px)
  const CONT=frame({name:"Content", dir:"HORIZONTAL",
    bg:"#0f0f12", w:1216, h:768, wFixed:true, hFixed:true, gap:0});
  // Height: 900 - 56(stats) - 36(toolbar) - 40(tabs) = 768

  // ── FILTER SIDEBAR — w-56, border-r, bg-secondary ──
  // Filtros.jsx: .card → bg-secondary border rounded-2xl p-5
  //   Filter icon + "Filtros" title
  //   Fonte select / Status select / Modalidade select / Inglês select
  const FS=frame({name:"Filter Panel", dir:"VERTICAL",
    bg:"#1a1a1f", w:224, h:768, wFixed:true, hFixed:true,
    pl:20,pr:20,pt:20,pb:20, gap:20,
    stroke:"#2e2e33"});

  // Header
  const fsH=frame({dir:"HORIZONTAL",gap:8,ai:"CENTER"});fsH.fills=none();
  fsH.appendChild(icon(15,"#71717a","sq"));
  fsH.appendChild(txt("Filtros",14,"Semi Bold","#ffffff"));
  FS.appendChild(fsH);

  // Select groups: label + select dropdown
  [{lbl:"Fonte",val:"Todas"},{lbl:"Status",val:"Todos"},
   {lbl:"Modalidade",val:"Todas"},{lbl:"Inglês",val:"Todos"}
  ].forEach(fg=>{
    const grp=frame({dir:"VERTICAL",gap:6,w:184,wFixed:true});grp.fills=none();
    grp.appendChild(txt(fg.lbl,13,"Medium","#a1a1aa"));
    // select: w-full px-3 py-2 bg-tertiary border border-border rounded-lg
    const sel=frame({dir:"HORIZONTAL",bg:"#252529",r:8,
      pl:12,pr:12,pt:8,pb:8, gap:0, jc:"SPACE_BETWEEN", ai:"CENTER",
      w:184,h:36,wFixed:true,hFixed:true, stroke:"#2e2e33"});
    sel.appendChild(txt(fg.val,13,"Regular","#ffffff"));
    sel.appendChild(icon(10,"#71717a","sq"));
    grp.appendChild(sel);
    FS.appendChild(grp);
  });
  CONT.appendChild(FS);

  // ── CARDS AREA — flex-1 p-4 ─────────────────────────
  // 1216 - 224 = 992px; p-4 (16px each side): 960px grid
  // xl:grid-cols-3 gap-3: (960-24)/3 = 312px per card
  const CA=frame({name:"Cards Area", dir:"VERTICAL",
    bg:"#0f0f12", w:992, h:768, wFixed:true, hFixed:true,
    pl:16,pr:16,pt:16,pb:16, gap:12});

  // ── VAGACARD FACTORY ─────────────────────────────────
  // VagaCard.jsx grid mode:
  // .card = bg-secondary border border-border rounded-2xl p-5 flex flex-col
  //
  // [Header] flex items-center SPACE_BETWEEN mb-3
  //   L: fonte-badge(px-1.5 py-0.5 rounded bg-tertiary font-medium text-10) + date(text-10 text-muted)
  //   R: score-badge(px-2 py-0.5 rounded text-10 font-bold) + heart(p-1.5 rounded-full)
  //
  // [Body] mb-3
  //   h3: font-semibold text-primary text-[15px] line-clamp-2
  //   p:  text-sm text-secondary mt-1  (empresa)
  //   p:  text-xs text-muted mt-0.5    (localização)
  //
  // [Tags] mb-3 flex flex-wrap gap-1.5
  //   default: px-2 py-0.5 rounded-full text-10 bg-tertiary text-secondary
  //   highlight (remoto/salario): bg-success/15 text-success
  //
  // [Actions] flex items-center SPACE_BETWEEN mt-auto pt-3 border-t
  //   L: StatusToggle(rounded-full pill) + Link2-icon
  //   R: Sparkles-btn + Aplicar-btn(border border-primary ghost)

  function makeVagaCard(vd) {
    const CW = 312; // card width
    const card=frame({name:`VagaCard — ${vd.empresa}`, dir:"VERTICAL",
      bg:"#1a1a1f", r:16, w:CW, wFixed:true, hFixed:false,
      pl:20,pr:20,pt:20,pb:20, gap:12,
      stroke:"#2e2e33"});

    // Header
    const CH=frame({dir:"HORIZONTAL",jc:"SPACE_BETWEEN",ai:"CENTER",
      w:CW-40,wFixed:true,hFixed:false}); CH.fills=none();
    // L: fonte + date
    const CHL=frame({dir:"HORIZONTAL",gap:8,ai:"CENTER"});CHL.fills=none();
    const fb=frame({dir:"HORIZONTAL",bg:"#252529",r:4,pl:6,pr:6,pt:2,pb:2});
    fb.appendChild(txt(vd.fonte,10,"Medium","#71717a")); CHL.appendChild(fb);
    CHL.appendChild(txt(vd.data,10,"Regular","#71717a")); CH.appendChild(CHL);
    // R: score + heart
    const CHR=frame({dir:"HORIZONTAL",gap:8,ai:"CENTER"});CHR.fills=none();
    const sc=frame({dir:"HORIZONTAL",gap:4,ai:"CENTER",
      bg: vd.destaque?"#22c55e":"#252529",bgOp:vd.destaque?0.2:1,
      r:4,pl:8,pr:8,pt:2,pb:2});
    if(vd.destaque){sc.appendChild(icon(10,"#22c55e","circle"));}
    sc.appendChild(txt(vd.score,10,"Bold",vd.destaque?"#22c55e":"#71717a"));
    CHR.appendChild(sc);
    const hrt=frame({dir:"HORIZONTAL",r:99,pl:6,pr:6,pt:6,pb:6});hrt.fills=none();
    hrt.appendChild(icon(14,"#71717a","circle")); CHR.appendChild(hrt);
    CH.appendChild(CHR); card.appendChild(CH);

    // Body: title + empresa + localização
    const BOD=frame({dir:"VERTICAL",gap:3,w:CW-40,wFixed:true});BOD.fills=none();
    BOD.appendChild(txt(vd.titulo,15,"Semi Bold","#ffffff",CW-40));
    BOD.appendChild(txt(vd.empresa,13,"Regular","#a1a1aa",CW-40));
    BOD.appendChild(txt(vd.local,12,"Regular","#71717a",CW-40));
    card.appendChild(BOD);

    // Tags
    const TAGS=frame({dir:"HORIZONTAL",gap:6});TAGS.fills=none();
    vd.tags.forEach(tg=>{
      const t=frame({dir:"HORIZONTAL",r:99,pl:8,pr:8,pt:2,pb:2,
        bg:tg.h?"#22c55e":"#252529",bgOp:tg.h?0.15:1});
      t.appendChild(txt(tg.l,10,"Medium",tg.h?"#22c55e":"#a1a1aa"));
      TAGS.appendChild(t);
    });
    card.appendChild(TAGS);

    // Divider border-t
    const bDiv=figma.createFrame();bDiv.resize(CW-40,1);bDiv.fills=fill("#2e2e33");
    card.appendChild(bDiv);

    // Actions: StatusToggle L | Sparkles+Aplicar R
    const ACTS=frame({dir:"HORIZONTAL",jc:"SPACE_BETWEEN",ai:"CENTER",
      w:CW-40,wFixed:true,hFixed:false});ACTS.fills=none();

    // StatusToggle
    const stCfg={pendente:{c:"#f59e0b",l:"Pendente"},aplicada:{c:"#22c55e",l:"Aplicada"},descartada:{c:"#71717a",l:"Descartada"}};
    const sc2=stCfg[vd.status]||stCfg.pendente;
    const stgl=frame({dir:"HORIZONTAL",gap:5,r:99,pl:10,pr:10,pt:4,pb:4,
      bg:sc2.c,bgOp:0.15,ai:"CENTER"});
    stgl.appendChild(icon(12,sc2.c,"circle"));
    stgl.appendChild(txt(sc2.l,10,"Semi Bold",sc2.c));
    ACTS.appendChild(stgl);

    // Right: Sparkles + Aplicar
    const ACTR=frame({dir:"HORIZONTAL",gap:8,ai:"CENTER"});ACTR.fills=none();
    // Sparkles: p-1.5 rounded-lg bg-purple/10 border border-purple/30
    const spk=frame({dir:"HORIZONTAL",bg:"#a855f7",bgOp:0.1,r:8,
      pl:6,pr:6,pt:6,pb:6,stroke:"#a855f7",strokeOp:0.3,
      w:28,h:28,wFixed:true,hFixed:true});
    spk.appendChild(icon(14,"#a855f7","sq")); ACTR.appendChild(spk);
    // Aplicar: px-3 py-1.5 rounded-lg border border-primary text-primary text-xs ghost
    const apl=frame({dir:"HORIZONTAL",r:8,pl:12,pr:12,pt:6,pb:6,
      gap:5,ai:"CENTER",stroke:"#6366f1"});apl.fills=none();
    apl.appendChild(txt("Aplicar",12,"Medium","#6366f1"));
    apl.appendChild(icon(11,"#6366f1","sq")); ACTR.appendChild(apl);
    ACTS.appendChild(ACTR);
    card.appendChild(ACTS);
    return card;
  }

  // ── RENDER 2 ROWS OF 3 CARDS ─────────────────────────
  const vagas=[
    {fonte:"LinkedIn",data:"Hoje",score:"92%",destaque:true,
     titulo:"Product Designer Sênior — Design System",
     empresa:"Nubank",local:"São Paulo, SP (Remoto)",
     tags:[{l:"Sênior",h:false},{l:"Remoto",h:true},{l:"CLT",h:false},{l:"R$ 12k-15k",h:true}],
     status:"pendente"},
    {fonte:"Indeed",data:"Ontem",score:"85%",destaque:false,
     titulo:"UX Designer Pleno — Growth & Experimentation",
     empresa:"iFood",local:"Osasco, SP (Híbrido)",
     tags:[{l:"Pleno",h:false},{l:"Híbrido",h:false},{l:"CLT",h:false},{l:"R$ 8k-11k",h:true}],
     status:"pendente"},
    {fonte:"Posts",data:"2d",score:"78%",destaque:false,
     titulo:"UX Lead — Seller Experience & Onboarding",
     empresa:"Mercado Livre",local:"Florianópolis (Remoto)",
     tags:[{l:"Lead",h:false},{l:"Remoto",h:true},{l:"PJ",h:false},{l:"R$ 18k-22k",h:true}],
     status:"aplicada"},
    {fonte:"LinkedIn",data:"3d",score:"74%",destaque:false,
     titulo:"Product Designer — Mobile & Consumer Apps",
     empresa:"PicPay",local:"Remoto",
     tags:[{l:"Pleno",h:false},{l:"Remoto",h:true},{l:"CLT",h:false}],
     status:"pendente"},
    {fonte:"Indeed",data:"4d",score:"71%",destaque:false,
     titulo:"UX/UI Designer — Plataforma B2B SaaS",
     empresa:"TOTVS",local:"São Paulo, SP (Híbrido)",
     tags:[{l:"Pleno",h:false},{l:"Híbrido",h:false},{l:"CLT",h:false},{l:"R$ 7k-9k",h:false}],
     status:"pendente"},
    {fonte:"Posts",data:"5d",score:"68%",destaque:false,
     titulo:"Senior UX Designer — Fintech Products",
     empresa:"Itaú Unibanco",local:"São Paulo (Híbrido)",
     tags:[{l:"Sênior",h:false},{l:"Híbrido",h:false},{l:"CLT",h:false}],
     status:"pendente"},
  ];

  // Row 1
  const row1=frame({dir:"HORIZONTAL",gap:12,w:960,wFixed:true,hFixed:false});row1.fills=none();
  vagas.slice(0,3).forEach(v=>row1.appendChild(makeVagaCard(v)));
  CA.appendChild(row1);

  // Row 2
  const row2=frame({dir:"HORIZONTAL",gap:12,w:960,wFixed:true,hFixed:false});row2.fills=none();
  vagas.slice(3,6).forEach(v=>row2.appendChild(makeVagaCard(v)));
  CA.appendChild(row2);

  CONT.appendChild(CA);
  MAIN.appendChild(CONT);
  ROOT.appendChild(MAIN);

  pg.appendChild(ROOT);
  figma.viewport.scrollAndZoomIntoView([ROOT]);
  console.log("✅ Dashboard V7 — estrutura fiel ao código real");

} catch(e){ console.error("❌ V7:",e.message,e.stack); throw e; }
})();
"""

if __name__ == "__main__":
    print("🎯 SENTINELA V7 — corrigindo bugs do V6:")
    print("   ✓ Sem spacer frames quebrados (usando gap nativo)")
    print("   ✓ Tabs row presente e correta")
    print("   ✓ 4 filter dropdowns visíveis")
    print("   ✓ VagaCards com itemSpacing correto")
    print("   ✓ Tags + StatusToggle + Sparkles + Aplicar")
    send(JS)
    print("✅ V7 disparado!")
