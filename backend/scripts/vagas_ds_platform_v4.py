import json
import urllib.request
import urllib.error

def disparar_para_figma(descricao_fase, codigo_js):
    print(f"💎 THE ELEGANT M3 BUILDER: {descricao_fase}")
    payload = {"code": codigo_js}
    req = urllib.request.Request(
        'http://localhost:9999/execute',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_str = response.read().decode()
            print(f"✅ SUCESSO: ({descricao_fase})\n")
    except urllib.error.URLError as e:
        print(f"❌ ERRO CRÍTICO no envio: {e.reason}")
        exit(1)


V4_PAYLOAD = """
(async () => {
try {
    // Carregar todas das fontes base antes de desenhar texto!
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
    const defaultFont = figma.createText().fontName;
    await figma.loadFontAsync(defaultFont);

    // ==========================================
    // 1. CONFIG INICIAIS E PAGE SETUP
    // ==========================================
    let sysPage = figma.root.children.find(node => node.name === "[SYSTEM] Design System");
    if(!sysPage) { sysPage = figma.createPage(); sysPage.name = "[SYSTEM] Design System"; }
    figma.currentPage = sysPage;

    // Resgata os PaintStyles (Surface, Primary, etc) que criamos no script Master M3
    const getP = (nm) => {
        let style = figma.getLocalPaintStyles().find(s => s.name === nm);
        return style ? style.id : null;
    };
    // TextStyles
    const getT = (nm) => {
        let style = figma.getLocalTextStyles().find(s => s.name === nm);
        return style ? style.id : null;
    };
    
    // Fallback Helpers
    const hexToRgb = (hex) => {
        let r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? {r: parseInt(r[1], 16)/255, g: parseInt(r[2], 16)/255, b: parseInt(r[3], 16)/255} : {r:0,g:0,b:0};
    };
    const makeTxtFallback = (str, sNm, cNm) => {
        const t = figma.createText(); t.characters = str.toString(); 
        if(getT(sNm)) t.textStyleId = getT(sNm);
        if(getP(cNm)) t.fillStyleId = getP(cNm);
        else t.fills=[{type:"SOLID", color: {r:1,g:1,b:1}}];
        return t;
    };

    // ==========================================
    // 2. CRIAÇÃO DO DESKTOP FRAME (MACBOOK PRO 16")
    // ==========================================
    const appFrame = figma.createFrame();
    appFrame.name = "💻 App Dashboard - Vagas UX (V4 Pixel Perfect)";
    appFrame.resize(1728, 1117); // Mac Pro 16
    appFrame.layoutMode = "HORIZONTAL"; // Sidebar Left + Content Right
    appFrame.primaryAxisSizingMode = "FIXED"; appFrame.counterAxisSizingMode = "FIXED";
    appFrame.fills = [{type:"SOLID", color: hexToRgb("#0c0c0e")}];
    appFrame.x = 2400; appFrame.y = 0; // Coloca ao lado do Master Board

    // ==========================================
    // 3. NAV SIDEBAR (ESQUERDA)
    // ==========================================
    const navBar = figma.createFrame();
    navBar.name = "Nav Sidebar"; navBar.layoutMode = "VERTICAL"; 
    
    // REQUIREMENT V4 FINAL: "Nav sidebar (Target icon+4 items)" 
    // Largura M3 Navigation Drawer = 360px (ou 280px). Vamos usar 280px (Vagas padrão Tailwind w-72 = 288px)
    navBar.resize(288, 1117);
    navBar.primaryAxisSizingMode = "FIXED"; navBar.counterAxisSizingMode = "FIXED";
    navBar.paddingLeft=24; navBar.paddingRight=24; navBar.paddingTop=40; navBar.paddingBottom=40;
    navBar.itemSpacing = 40;
    navBar.fillStyleId = getP("surface");
    navBar.strokes=[{type:"SOLID", color: hexToRgb("#2e2e33")}]; navBar.strokeWeight=1; // Border-r
    
    // Logo Area
    const logoRow = figma.createFrame(); logoRow.layoutMode="HORIZONTAL"; logoRow.fills=[]; logoRow.itemSpacing=12; logoRow.counterAxisAlignItems="CENTER";
    const logoIco = figma.createFrame(); logoIco.resize(32,32); logoIco.cornerRadius=8; logoIco.fills=[{type:"SOLID", color: hexToRgb("#6366f1")}];
    logoRow.appendChild(logoIco);
    logoRow.appendChild(makeTxtFallback("Vagas UX", "heading", "text_main"));
    navBar.appendChild(logoRow);

    // Menu List (4 items)
    const menuList = figma.createFrame(); menuList.layoutMode="VERTICAL"; menuList.fills=[]; menuList.itemSpacing=8;
    menuList.primaryAxisSizingMode="AUTO"; menuList.layoutAlign="STRETCH";
    const makeNavItem = (tx, active) => {
        let it = figma.createFrame(); it.layoutMode="HORIZONTAL"; it.fills=[]; it.itemSpacing=16; it.counterAxisAlignItems="CENTER";
        it.layoutAlign="STRETCH"; it.paddingLeft=16; it.paddingRight=16; it.paddingTop=12; it.paddingBottom=12; it.cornerRadius=8;
        
        let ic = figma.createFrame(); ic.resize(20,20); ic.cornerRadius=4;
        
        if(active) {
            it.fillStyleId = getP("primary_container");
            ic.fills=[{type:"SOLID", color: hexToRgb("#6366f1")}];
            it.appendChild(ic);
            it.appendChild(makeTxtFallback(tx, "body", "primary"));
        } else {
            ic.fills=[{type:"SOLID", color: hexToRgb("#8b8b93")}];
            it.appendChild(ic);
            it.appendChild(makeTxtFallback(tx, "body", "text_muted"));
        }
        return it;
    };
    menuList.appendChild(makeNavItem("Dashboard", true));
    menuList.appendChild(makeNavItem("Match Analysis", false));
    menuList.appendChild(makeNavItem("Configurações", false));
    menuList.appendChild(makeNavItem("Assinatura", false));
    
    navBar.appendChild(menuList);
    appFrame.appendChild(navBar);

    // ==========================================
    // 4. MAIN CONTENT AREA (DIREITA)
    // ==========================================
    const mainArea = figma.createFrame();
    mainArea.name = "Main Content Area"; mainArea.layoutMode = "VERTICAL"; 
    // Restante da largura (1728 - 288 = 1440)
    mainArea.resize(1440, 1117);
    mainArea.primaryAxisSizingMode = "FIXED"; mainArea.counterAxisSizingMode = "FIXED";
    mainArea.fills = [];
    appFrame.appendChild(mainArea);
    
    // HEADER BAR (TOP)
    const topBar = figma.createFrame();
    topBar.name = "Top Header Bar"; topBar.layoutMode="HORIZONTAL"; topBar.layoutAlign="STRETCH"; topBar.itemSpacing=0;
    topBar.primaryAxisAlignItems="SPACE_BETWEEN"; topBar.counterAxisAlignItems="CENTER";
    topBar.paddingLeft=40; topBar.paddingRight=40; topBar.paddingTop=24; topBar.paddingBottom=24;
    topBar.fills=[]; topBar.strokes=[{type:"SOLID", color: hexToRgb("#2e2e33")}]; topBar.strokeWeight=1; // Border-b
    
    const pageTitleGrp = figma.createFrame(); pageTitleGrp.layoutMode="VERTICAL"; pageTitleGrp.fills=[];
    pageTitleGrp.appendChild(makeTxtFallback("Dashboard de Vagas", "section", "text_main"));
    pageTitleGrp.appendChild(makeTxtFallback("Monitorando suas vagas em tempo real via IA", "body", "text_muted"));
    topBar.appendChild(pageTitleGrp);
    
    const usrBtn = figma.createFrame(); usrBtn.layoutMode="HORIZONTAL"; usrBtn.itemSpacing=12; usrBtn.counterAxisAlignItems="CENTER";
    usrBtn.fills=[];
    usrBtn.appendChild(makeTxtFallback("William Marangon", "label", "text_main"));
    const av = figma.createFrame(); av.resize(40,40); av.cornerRadius=20; av.fills=[{type:"SOLID", color: hexToRgb("#333339")}];
    usrBtn.appendChild(av);
    topBar.appendChild(usrBtn);
    
    mainArea.appendChild(topBar);

    // CONTENT WRAPPER ROW (FILTERS LEFT + FEED RIGHT)
    const contentRow = figma.createFrame();
    contentRow.name = "Content Split Row"; contentRow.layoutMode="HORIZONTAL"; contentRow.layoutAlign="STRETCH";
    contentRow.primaryAxisSizingMode="AUTO"; contentRow.counterAxisSizingMode="AUTO"; contentRow.layoutGrow=1;
    contentRow.fills=[];
    mainArea.appendChild(contentRow);

    // ==========================================
    // 5. FILTER SIDEBAR (V4 REQUIREMENT = 224px w-56)
    // ==========================================
    const filterSide = figma.createFrame();
    filterSide.name = "Filter Sidebar"; filterSide.layoutMode = "VERTICAL"; filterSide.itemSpacing=32;
    filterSide.layoutAlign="STRETCH";
    filterSide.resize(224, 800);  // REQUIREMENT: w-56 = 224px
    filterSide.primaryAxisSizingMode = "FIXED"; filterSide.counterAxisSizingMode = "FIXED";
    filterSide.paddingLeft=32; filterSide.paddingRight=32; filterSide.paddingTop=40; filterSide.paddingBottom=40;
    filterSide.fillStyleId = getP("surface");
    filterSide.strokes=[{type:"SOLID", color: hexToRgb("#2e2e33")}]; filterSide.strokeWeight=1; // Border-r
    
    const fltTitle = makeTxtFallback("Filtros Ativos", "label", "text_main");
    filterSide.appendChild(fltTitle);

    const makeSwitchRow = (lbl) => {
        let r = figma.createFrame(); r.layoutMode="HORIZONTAL"; r.primaryAxisAlignItems="SPACE_BETWEEN"; r.layoutAlign="STRETCH"; r.fills=[];
        r.appendChild(makeTxtFallback(lbl, "tiny", "text_muted"));
        let tgl = figma.createFrame(); tgl.resize(32,18); tgl.cornerRadius=9; tgl.fills=[{type:"SOLID", color: hexToRgb("#6366f1")}];
        r.appendChild(tgl);
        return r;
    };
    filterSide.appendChild(makeSwitchRow("LinkedIn (90%)"));
    filterSide.appendChild(makeSwitchRow("Indeed (10%)"));
    filterSide.appendChild(makeSwitchRow("Apenas Remoto"));
    
    contentRow.appendChild(filterSide);

    // ==========================================
    // 6. MAIN FEED / VAGA CARDS
    // ==========================================
    const feedCol = figma.createFrame();
    feedCol.name="Job Feed ScrollArea"; feedCol.layoutMode="VERTICAL"; feedCol.layoutGrow=1; feedCol.layoutAlign="STRETCH";
    feedCol.paddingLeft=40; feedCol.paddingRight=40; feedCol.paddingTop=40; feedCol.paddingBottom=100;
    feedCol.itemSpacing=32; feedCol.fills=[];
    
    // STATS CARDS ROW (V4 REQUIREMENT: StatCard inline icon+label+value)
    const statsRow = figma.createFrame(); statsRow.name="Stats Metrics"; statsRow.layoutMode="HORIZONTAL";
    statsRow.layoutAlign="STRETCH"; statsRow.itemSpacing=24; statsRow.fills=[];

    const makeStatCard = (lbl, val, success) => {
        const sc = figma.createFrame(); sc.name="StatCard"; sc.layoutMode="HORIZONTAL"; sc.itemSpacing=16;
        sc.layoutGrow=1; sc.cornerRadius=16; sc.paddingLeft=24; sc.paddingRight=24; sc.paddingTop=24; sc.paddingBottom=24;
        sc.fillStyleId = getP("surface"); sc.strokes=[{type:"SOLID", color: hexToRgb("#2e2e33")}]; sc.strokeWeight=1;
        sc.counterAxisAlignItems="CENTER"; // Inline horizontal alignment
        
        // Block Icon
        const sbI = figma.createFrame(); sbI.resize(48,48); sbI.cornerRadius=12; 
        sbI.fills=[{type:"SOLID", color: hexToRgb(success ? "#22c55e" : "#6366f1"), opacity: 0.15}];
        sc.appendChild(sbI);
        
        // Data block
        const dt = figma.createFrame(); dt.layoutMode="VERTICAL"; dt.fills=[]; dt.itemSpacing=4;
        dt.appendChild(makeTxtFallback(val, "section", success ? "success" : "text_main"));
        dt.appendChild(makeTxtFallback(lbl, "tiny", "text_muted"));
        sc.appendChild(dt);
        
        return sc;
    };
    statsRow.appendChild(makeStatCard("Total de Vagas Scrapeadas", "128", false));
    statsRow.appendChild(makeStatCard("Matches Acima de 80%", "45", true));
    statsRow.appendChild(makeStatCard("Alertas Despachados Hoje", "12", false));
    feedCol.appendChild(statsRow);
    
    // LISTA DE VAGAS ==================
    feedCol.appendChild(makeTxtFallback("Latest Job Matches", "heading", "text_main"));

    // O Componente do VagaCard Oficial que recriamos na Seção 2 da MasterBoard
    const vCardTemplate = () => {
        const vCard = figma.createFrame(); vCard.name="Vaga App Card"; vCard.layoutMode="VERTICAL"; vCard.itemSpacing=24;
        vCard.paddingLeft=32; vCard.paddingRight=32; vCard.paddingTop=32; vCard.paddingBottom=32;
        vCard.cornerRadius=16; vCard.layoutAlign="STRETCH"; vCard.primaryAxisSizingMode="AUTO";
        vCard.fillStyleId=getP("surface"); vCard.strokes=[{type:"SOLID", color: hexToRgb("#2e2e33")}]; vCard.strokeWeight=1;

        // Header
        const ch = figma.createFrame(); ch.layoutMode="HORIZONTAL"; ch.fills=[]; ch.layoutAlign="STRETCH"; ch.primaryAxisAlignItems="SPACE_BETWEEN"; ch.counterAxisAlignItems="CENTER";
        const ct = figma.createFrame(); ct.layoutMode="VERTICAL"; ct.fills=[]; ct.itemSpacing=8;
        ct.appendChild(makeTxtFallback("Nubank", "label", "text_muted"));
        ct.appendChild(makeTxtFallback("Product Designer Sênior (Design System)", "heading", "text_main"));
        ch.appendChild(ct);
        
        const bMatch = figma.createFrame(); bMatch.layoutMode="HORIZONTAL"; bMatch.itemSpacing=6; bMatch.fillStyleId=getP("success_bg");
        bMatch.paddingLeft=12; bMatch.paddingRight=12; bMatch.paddingTop=6; bMatch.paddingBottom=6; bMatch.cornerRadius=99; bMatch.primaryAxisSizingMode="AUTO"; bMatch.counterAxisSizingMode="AUTO";
        bMatch.appendChild(makeTxtFallback("✨ 92% Match", "tiny", "success"));
        ch.appendChild(bMatch);
        vCard.appendChild(ch);

        // Tags
        const tWrap = figma.createFrame(); tWrap.layoutMode="HORIZONTAL"; tWrap.itemSpacing=12; tWrap.fills=[];
        const mkTag = (tx) => { const t = figma.createFrame(); t.layoutMode="HORIZONTAL"; t.fills=[{type:"SOLID", color: hexToRgb("#252529")}]; t.paddingLeft=12; t.paddingRight=12; t.paddingTop=6; t.paddingBottom=6; t.cornerRadius=6; t.appendChild(makeTxtFallback(tx, "tiny", "text_main")); return t; };
        tWrap.appendChild(mkTag("📍 Remoto")); tWrap.appendChild(mkTag("💼 CLT")); tWrap.appendChild(mkTag("📈 Sênior")); tWrap.appendChild(mkTag("💰 R$ 12k - R$ 15k"));
        vCard.appendChild(tWrap);

        // Action Buttons (USANDO O PADDING M3 OFICIAL px=16 py=10)
        const act = figma.createFrame(); act.layoutMode="HORIZONTAL"; act.itemSpacing=16; act.fills=[];
        const a1 = figma.createFrame(); a1.layoutMode="HORIZONTAL"; a1.itemSpacing=8; a1.counterAxisAlignItems="CENTER";
        a1.fillStyleId=getP("primary"); a1.paddingLeft=24; a1.paddingRight=24; a1.paddingTop=10; a1.paddingBottom=10; a1.cornerRadius=100;
        a1.appendChild(makeTxtFallback("Candidatar", "label", "text_main"));
        
        const a2 = figma.createFrame(); a2.layoutMode="HORIZONTAL"; a2.itemSpacing=8; a2.counterAxisAlignItems="CENTER";
        a2.fills=[]; a2.strokes=[{type:"SOLID", color: hexToRgb("#2e2e33")}]; a2.strokeWeight=1;
        a2.paddingLeft=16; a2.paddingRight=24; a2.paddingTop=10; a2.paddingBottom=10; a2.cornerRadius=100;
        
        const aic = figma.createFrame(); aic.resize(16,16); aic.cornerRadius=8; aic.fills=[{type:"SOLID", color: hexToRgb("#8b8b93")}];
        a2.appendChild(aic);
        a2.appendChild(makeTxtFallback("Gerar Pitch", "label", "text_muted"));
        
        act.appendChild(a1); act.appendChild(a2);
        vCard.appendChild(act);

        return vCard;
    };

    feedCol.appendChild(vCardTemplate());
    feedCol.appendChild(vCardTemplate());
    
    contentRow.appendChild(feedCol);

    // ==========================================
    // 7. FINALIZANDO E RENDERIZANDO
    // ==========================================
    sysPage.appendChild(appFrame);
    figma.viewport.scrollAndZoomIntoView([appFrame]);

} catch(e) { console.error("Crash App V4 Generation", e); throw e; }
})();
"""

if __name__ == "__main__":
    disparar_para_figma("DASHBOARD APP PLATFORM V4: Injeção", V4_PAYLOAD)
