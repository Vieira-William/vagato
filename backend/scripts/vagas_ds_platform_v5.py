import json
import urllib.request
import urllib.error

def disparar_para_figma(descricao_fase, codigo_js):
    print(f"💎 SENTINELA V5: {descricao_fase}")
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


V5_PAYLOAD = """
(async () => {
try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });

    // =============================================
    // HELPERS — cores hardcoded, zero dependência
    // =============================================
    const rgb = (hex) => {
        let r = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
        return r ? {r: parseInt(r[1],16)/255, g: parseInt(r[2],16)/255, b: parseInt(r[3],16)/255} : {r:0,g:0,b:0};
    };
    const solid = (hex, op=1) => [{type:"SOLID", color: rgb(hex), opacity: op}];

    const txt = (str, size, weight, hex, w) => {
        const t = figma.createText();
        t.fontName = { family: "Inter", style: weight };
        t.characters = String(str);
        t.fontSize = size;
        t.fills = solid(hex);
        if (w) { t.textAutoResize = "HEIGHT"; t.resize(w, 20); }
        return t;
    };

    // =============================================
    // PÁGINA TARGET
    // =============================================
    let pg = figma.root.children.find(n => n.name === "[SYSTEM] Design System");
    if (!pg) { pg = figma.createPage(); pg.name = "[SYSTEM] Design System"; }
    figma.currentPage = pg;

    // Remove frame anterior se existir (re-run safe)
    const old = pg.children.find(n => n.name === "💻 Dashboard V5");
    if (old) old.remove();

    // =============================================
    // ROOT FRAME — MacBook Pro 16" 1728x1117
    // =============================================
    const root = figma.createFrame();
    root.name = "💻 Dashboard V5";
    root.resize(1728, 1117);
    root.layoutMode = "HORIZONTAL";
    root.primaryAxisSizingMode = "FIXED";
    root.counterAxisSizingMode = "FIXED";
    root.fills = solid("#0f0f12");
    root.x = 2800; root.y = 0;

    // =============================================
    // 1. NAV SIDEBAR — 224px
    // =============================================
    const nav = figma.createFrame();
    nav.name = "Nav Sidebar";
    nav.layoutMode = "VERTICAL";
    nav.resize(224, 1117);
    nav.primaryAxisSizingMode = "FIXED";
    nav.counterAxisSizingMode = "FIXED";
    nav.paddingLeft = 16; nav.paddingRight = 16;
    nav.paddingTop = 32; nav.paddingBottom = 32;
    nav.itemSpacing = 8;
    nav.fills = solid("#1a1a1f");
    nav.strokes = solid("#2e2e33"); nav.strokeWeight = 1;
    nav.strokeAlign = "INSIDE";

    // Logo
    const logoRow = figma.createFrame();
    logoRow.layoutMode = "HORIZONTAL"; logoRow.fills = [];
    logoRow.itemSpacing = 10; logoRow.counterAxisAlignItems = "CENTER";
    logoRow.paddingLeft = 12; logoRow.paddingRight = 12;
    logoRow.paddingTop = 10; logoRow.paddingBottom = 10;
    logoRow.primaryAxisSizingMode = "AUTO"; logoRow.counterAxisSizingMode = "AUTO";
    const logoIco = figma.createFrame();
    logoIco.resize(28, 28); logoIco.cornerRadius = 6;
    logoIco.fills = solid("#6366f1");
    logoRow.appendChild(logoIco);
    logoRow.appendChild(txt("Vagas UX", 15, "Bold", "#ffffff"));
    nav.appendChild(logoRow);

    // Divider
    const div1 = figma.createFrame();
    div1.resize(192, 1); div1.fills = solid("#2e2e33");
    nav.appendChild(div1);

    // Nav Items
    const navItems = [
        { label: "Dashboard", active: true, color: "#6366f1" },
        { label: "Match Analysis", active: false, color: "#71717a" },
        { label: "Configurações", active: false, color: "#71717a" },
        { label: "Perfil", active: false, color: "#71717a" },
    ];
    navItems.forEach(item => {
        const row = figma.createFrame();
        row.layoutMode = "HORIZONTAL";
        row.layoutAlign = "STRETCH";
        row.primaryAxisSizingMode = "FIXED";
        row.resize(192, 40);
        row.counterAxisSizingMode = "FIXED";
        row.itemSpacing = 10; row.counterAxisAlignItems = "CENTER";
        row.paddingLeft = 12; row.paddingRight = 12;
        row.cornerRadius = 8;
        row.fills = item.active ? solid("#6366f1", 0.15) : [];

        const dot = figma.createFrame();
        dot.resize(8, 8); dot.cornerRadius = 4;
        dot.fills = solid(item.active ? "#6366f1" : "#52525b");
        row.appendChild(dot);
        row.appendChild(txt(item.label, 13, item.active ? "Bold" : "Medium", item.active ? "#6366f1" : "#a1a1aa"));
        nav.appendChild(row);
    });

    root.appendChild(nav);

    // =============================================
    // 2. MAIN AREA — 1504px
    // =============================================
    const main = figma.createFrame();
    main.name = "Main Area";
    main.layoutMode = "VERTICAL";
    main.resize(1504, 1117);
    main.primaryAxisSizingMode = "FIXED";
    main.counterAxisSizingMode = "FIXED";
    main.fills = [];
    root.appendChild(main);

    // --- TOP BAR ---
    const topBar = figma.createFrame();
    topBar.name = "Top Bar";
    topBar.layoutMode = "HORIZONTAL";
    topBar.resize(1504, 72);
    topBar.primaryAxisSizingMode = "FIXED"; topBar.counterAxisSizingMode = "FIXED";
    topBar.primaryAxisAlignItems = "SPACE_BETWEEN";
    topBar.counterAxisAlignItems = "CENTER";
    topBar.paddingLeft = 40; topBar.paddingRight = 40;
    topBar.fills = solid("#1a1a1f");
    topBar.strokes = solid("#2e2e33"); topBar.strokeWeight = 1;
    topBar.strokeAlign = "INSIDE";

    const titleGrp = figma.createFrame();
    titleGrp.layoutMode = "VERTICAL"; titleGrp.fills = []; titleGrp.itemSpacing = 2;
    titleGrp.primaryAxisSizingMode = "AUTO"; titleGrp.counterAxisSizingMode = "AUTO";
    titleGrp.appendChild(txt("Dashboard de Vagas", 18, "Bold", "#ffffff"));
    titleGrp.appendChild(txt("Monitorando suas vagas em tempo real via IA", 13, "Regular", "#71717a"));
    topBar.appendChild(titleGrp);

    const userRow = figma.createFrame();
    userRow.layoutMode = "HORIZONTAL"; userRow.fills = [];
    userRow.itemSpacing = 10; userRow.counterAxisAlignItems = "CENTER";
    userRow.primaryAxisSizingMode = "AUTO"; userRow.counterAxisSizingMode = "AUTO";
    userRow.appendChild(txt("William Marangon", 13, "Medium", "#a1a1aa"));
    const avatar = figma.createFrame();
    avatar.resize(36, 36); avatar.cornerRadius = 18;
    avatar.fills = solid("#252529");
    userRow.appendChild(avatar);
    topBar.appendChild(userRow);
    main.appendChild(topBar);

    // --- TABS BAR ---
    const tabsBar = figma.createFrame();
    tabsBar.name = "Tabs";
    tabsBar.layoutMode = "HORIZONTAL";
    tabsBar.resize(1504, 48);
    tabsBar.primaryAxisSizingMode = "FIXED"; tabsBar.counterAxisSizingMode = "FIXED";
    tabsBar.paddingLeft = 40; tabsBar.paddingRight = 40;
    tabsBar.itemSpacing = 0;
    tabsBar.counterAxisAlignItems = "CENTER";
    tabsBar.fills = solid("#1a1a1f");
    tabsBar.strokes = solid("#2e2e33"); tabsBar.strokeWeight = 1;
    tabsBar.strokeAlign = "INSIDE";

    const tabs = ["Todas", "Indeed", "LinkedIn Vagas", "LinkedIn Posts", "⭐ Destaques"];
    tabs.forEach((label, i) => {
        const tab = figma.createFrame();
        tab.layoutMode = "HORIZONTAL"; tab.fills = [];
        tab.paddingLeft = 16; tab.paddingRight = 16;
        tab.paddingTop = 12; tab.paddingBottom = 12;
        tab.primaryAxisSizingMode = "AUTO"; tab.counterAxisSizingMode = "AUTO";
        const isActive = i === 0;
        tab.strokes = isActive ? [{type:"SOLID", color: rgb("#6366f1")}] : [];
        tab.strokeWeight = isActive ? 2 : 0;
        tab.strokeAlign = "INSIDE";
        tab.appendChild(txt(label, 13, isActive ? "Bold" : "Medium", isActive ? "#6366f1" : "#71717a"));
        tabsBar.appendChild(tab);
    });
    main.appendChild(tabsBar);

    // --- CONTENT ROW (Filters + Feed) ---
    const contentRow = figma.createFrame();
    contentRow.name = "Content Row";
    contentRow.layoutMode = "HORIZONTAL";
    contentRow.resize(1504, 997); // 1117 - 72 - 48 = 997
    contentRow.primaryAxisSizingMode = "FIXED";
    contentRow.counterAxisSizingMode = "FIXED";
    contentRow.fills = [];
    main.appendChild(contentRow);

    // --- FILTER SIDEBAR — 224px ---
    const filterPanel = figma.createFrame();
    filterPanel.name = "Filter Panel";
    filterPanel.layoutMode = "VERTICAL";
    filterPanel.resize(224, 997);
    filterPanel.primaryAxisSizingMode = "FIXED"; filterPanel.counterAxisSizingMode = "FIXED";
    filterPanel.paddingLeft = 24; filterPanel.paddingRight = 24;
    filterPanel.paddingTop = 32; filterPanel.paddingBottom = 32;
    filterPanel.itemSpacing = 24;
    filterPanel.fills = solid("#1a1a1f");
    filterPanel.strokes = solid("#2e2e33"); filterPanel.strokeWeight = 1;
    filterPanel.strokeAlign = "INSIDE";

    filterPanel.appendChild(txt("Filtros", 13, "Bold", "#ffffff"));

    const filterGroups = [
        { label: "Fonte", items: ["Indeed", "LinkedIn Jobs", "LinkedIn Posts"] },
        { label: "Modalidade", items: ["Remoto", "Híbrido", "Presencial"] },
        { label: "Status", items: ["Pendente", "Favoritas", "Aplicadas"] },
    ];
    filterGroups.forEach(group => {
        const grpFrame = figma.createFrame();
        grpFrame.layoutMode = "VERTICAL"; grpFrame.fills = []; grpFrame.itemSpacing = 8;
        grpFrame.primaryAxisSizingMode = "AUTO"; grpFrame.counterAxisSizingMode = "AUTO";
        grpFrame.appendChild(txt(group.label, 11, "Bold", "#52525b"));
        group.items.forEach(item => {
            const row = figma.createFrame();
            row.layoutMode = "HORIZONTAL"; row.fills = [];
            row.primaryAxisAlignItems = "SPACE_BETWEEN";
            row.primaryAxisSizingMode = "FIXED"; row.resize(176, 24);
            row.counterAxisSizingMode = "FIXED";
            row.counterAxisAlignItems = "CENTER";
            row.appendChild(txt(item, 12, "Regular", "#a1a1aa"));
            const chk = figma.createFrame();
            chk.resize(16, 16); chk.cornerRadius = 4;
            chk.fills = solid("#252529");
            chk.strokes = solid("#3f3f46"); chk.strokeWeight = 1;
            row.appendChild(chk);
            grpFrame.appendChild(row);
        });
        filterPanel.appendChild(grpFrame);
    });
    contentRow.appendChild(filterPanel);

    // --- FEED COLUMN — 1280px ---
    const feed = figma.createFrame();
    feed.name = "Job Feed";
    feed.layoutMode = "VERTICAL";
    feed.resize(1280, 997);
    feed.primaryAxisSizingMode = "FIXED"; feed.counterAxisSizingMode = "FIXED";
    feed.paddingLeft = 40; feed.paddingRight = 40;
    feed.paddingTop = 32; feed.paddingBottom = 40;
    feed.itemSpacing = 24;
    feed.fills = [];
    contentRow.appendChild(feed);

    // --- STAT CARDS ROW ---
    const statsRow = figma.createFrame();
    statsRow.name = "Stats Row";
    statsRow.layoutMode = "HORIZONTAL";
    statsRow.resize(1200, 96);
    statsRow.primaryAxisSizingMode = "FIXED"; statsRow.counterAxisSizingMode = "FIXED";
    statsRow.itemSpacing = 20;
    statsRow.fills = [];

    const statCards = [
        { label: "Total de Vagas", value: "114", icon: "#6366f1", trend: "+12 hoje" },
        { label: "Matches > 80%", value: "47", icon: "#22c55e", trend: "+5 hoje" },
        { label: "Favoritas", value: "8", icon: "#f59e0b", trend: "" },
        { label: "Aplicadas", value: "3", icon: "#06b6d4", trend: "" },
        { label: "Gasto IA", value: "$0.82", icon: "#a855f7", trend: "saldo $4.18" },
    ];
    statCards.forEach(sc => {
        const card = figma.createFrame();
        card.name = "StatCard";
        card.layoutMode = "HORIZONTAL";
        card.resize(220, 96);
        card.primaryAxisSizingMode = "FIXED"; card.counterAxisSizingMode = "FIXED";
        card.paddingLeft = 20; card.paddingRight = 20;
        card.paddingTop = 16; card.paddingBottom = 16;
        card.itemSpacing = 14; card.counterAxisAlignItems = "CENTER";
        card.cornerRadius = 12;
        card.fills = solid("#1a1a1f");
        card.strokes = solid("#2e2e33"); card.strokeWeight = 1;

        const iconBox = figma.createFrame();
        iconBox.resize(44, 44); iconBox.cornerRadius = 10;
        iconBox.fills = solid(sc.icon, 0.15);
        const iconDot = figma.createFrame();
        iconDot.resize(20, 20); iconDot.cornerRadius = 4;
        iconDot.fills = solid(sc.icon);
        iconDot.x = 12; iconDot.y = 12;
        iconBox.appendChild(iconDot);
        card.appendChild(iconBox);

        const dataGrp = figma.createFrame();
        dataGrp.layoutMode = "VERTICAL"; dataGrp.fills = []; dataGrp.itemSpacing = 2;
        dataGrp.primaryAxisSizingMode = "AUTO"; dataGrp.counterAxisSizingMode = "AUTO";
        dataGrp.appendChild(txt(sc.value, 22, "Bold", "#ffffff"));
        dataGrp.appendChild(txt(sc.label, 11, "Medium", "#71717a"));
        if (sc.trend) dataGrp.appendChild(txt(sc.trend, 11, "Regular", "#22c55e"));
        card.appendChild(dataGrp);
        statsRow.appendChild(card);
    });
    feed.appendChild(statsRow);

    // Section header
    const sectionHdr = figma.createFrame();
    sectionHdr.layoutMode = "HORIZONTAL"; sectionHdr.fills = [];
    sectionHdr.primaryAxisAlignItems = "SPACE_BETWEEN";
    sectionHdr.primaryAxisSizingMode = "FIXED"; sectionHdr.resize(1200, 24);
    sectionHdr.counterAxisSizingMode = "FIXED"; sectionHdr.counterAxisAlignItems = "CENTER";
    sectionHdr.appendChild(txt("Vagas Mais Recentes", 15, "Bold", "#ffffff"));
    sectionHdr.appendChild(txt("Ver todas →", 13, "Medium", "#6366f1"));
    feed.appendChild(sectionHdr);

    // --- VAGA CARDS (3 cards) ---
    const vagasData = [
        { empresa: "Nubank", titulo: "Product Designer Sênior — Design System", match: "92%", matchColor: "#22c55e", tags: ["Remoto", "CLT", "Sênior", "R$ 12k–15k"], fonte: "LinkedIn", data: "Hoje" },
        { empresa: "iFood", titulo: "UX Designer Pleno — Growth & Experimentation", match: "85%", matchColor: "#22c55e", tags: ["Híbrido (SP)", "CLT", "Pleno", "R$ 8k–11k"], fonte: "Indeed", data: "Ontem" },
        { empresa: "Mercado Livre", titulo: "UX Lead — Seller Experience", match: "78%", matchColor: "#f59e0b", tags: ["Remoto", "PJ", "Lead", "R$ 18k–22k"], fonte: "LinkedIn", data: "2 dias" },
    ];

    vagasData.forEach(vaga => {
        const card = figma.createFrame();
        card.name = "VagaCard — " + vaga.empresa;
        card.layoutMode = "VERTICAL";
        card.resize(1200, 160);
        card.primaryAxisSizingMode = "FIXED"; card.counterAxisSizingMode = "FIXED";
        card.paddingLeft = 28; card.paddingRight = 28;
        card.paddingTop = 24; card.paddingBottom = 24;
        card.itemSpacing = 16;
        card.cornerRadius = 12;
        card.fills = solid("#1a1a1f");
        card.strokes = solid("#2e2e33"); card.strokeWeight = 1;

        // Header row: empresa + titulo + badge match
        const hdr = figma.createFrame();
        hdr.layoutMode = "HORIZONTAL"; hdr.fills = [];
        hdr.primaryAxisAlignItems = "SPACE_BETWEEN";
        hdr.primaryAxisSizingMode = "FIXED"; hdr.resize(1144, 48);
        hdr.counterAxisSizingMode = "FIXED"; hdr.counterAxisAlignItems = "CENTER";

        const titleCol = figma.createFrame();
        titleCol.layoutMode = "VERTICAL"; titleCol.fills = []; titleCol.itemSpacing = 4;
        titleCol.primaryAxisSizingMode = "AUTO"; titleCol.counterAxisSizingMode = "AUTO";
        titleCol.appendChild(txt(vaga.empresa, 12, "Medium", "#71717a"));
        titleCol.appendChild(txt(vaga.titulo, 15, "Bold", "#ffffff"));
        hdr.appendChild(titleCol);

        const badge = figma.createFrame();
        badge.layoutMode = "HORIZONTAL"; badge.cornerRadius = 99;
        badge.paddingLeft = 12; badge.paddingRight = 12;
        badge.paddingTop = 6; badge.paddingBottom = 6;
        badge.primaryAxisSizingMode = "AUTO"; badge.counterAxisSizingMode = "AUTO";
        badge.fills = solid(vaga.matchColor, 0.15);
        badge.appendChild(txt("✨ " + vaga.match + " Match", 12, "Bold", vaga.matchColor));
        hdr.appendChild(badge);
        card.appendChild(hdr);

        // Tags row
        const tagsRow = figma.createFrame();
        tagsRow.layoutMode = "HORIZONTAL"; tagsRow.fills = [];
        tagsRow.itemSpacing = 8;
        tagsRow.primaryAxisSizingMode = "AUTO"; tagsRow.counterAxisSizingMode = "AUTO";
        vaga.tags.forEach(tag => {
            const t = figma.createFrame();
            t.layoutMode = "HORIZONTAL";
            t.paddingLeft = 10; t.paddingRight = 10;
            t.paddingTop = 5; t.paddingBottom = 5;
            t.cornerRadius = 6;
            t.primaryAxisSizingMode = "AUTO"; t.counterAxisSizingMode = "AUTO";
            t.fills = solid("#252529");
            t.strokes = solid("#3f3f46"); t.strokeWeight = 1;
            t.appendChild(txt(tag, 11, "Medium", "#a1a1aa"));
            tagsRow.appendChild(t);
        });
        card.appendChild(tagsRow);

        // Actions row
        const acts = figma.createFrame();
        acts.layoutMode = "HORIZONTAL"; acts.fills = [];
        acts.itemSpacing = 12;
        acts.primaryAxisSizingMode = "AUTO"; acts.counterAxisSizingMode = "AUTO";
        acts.counterAxisAlignItems = "CENTER";

        const btn1 = figma.createFrame();
        btn1.layoutMode = "HORIZONTAL"; btn1.cornerRadius = 100;
        btn1.paddingLeft = 20; btn1.paddingRight = 20;
        btn1.paddingTop = 8; btn1.paddingBottom = 8;
        btn1.primaryAxisSizingMode = "AUTO"; btn1.counterAxisSizingMode = "AUTO";
        btn1.fills = solid("#6366f1");
        btn1.appendChild(txt("Ver Vaga", 13, "Bold", "#ffffff"));
        acts.appendChild(btn1);

        const btn2 = figma.createFrame();
        btn2.layoutMode = "HORIZONTAL"; btn2.cornerRadius = 100;
        btn2.paddingLeft = 20; btn2.paddingRight = 20;
        btn2.paddingTop = 8; btn2.paddingBottom = 8;
        btn2.primaryAxisSizingMode = "AUTO"; btn2.counterAxisSizingMode = "AUTO";
        btn2.fills = [];
        btn2.strokes = solid("#3f3f46"); btn2.strokeWeight = 1;
        btn2.appendChild(txt("Gerar Pitch ✨", 13, "Medium", "#a1a1aa"));
        acts.appendChild(btn2);

        const srcLabel = txt(vaga.fonte + " · " + vaga.data, 11, "Regular", "#52525b");
        acts.appendChild(srcLabel);

        card.appendChild(acts);
        feed.appendChild(card);
    });

    // =============================================
    // FINALIZAR
    // =============================================
    pg.appendChild(root);
    figma.viewport.scrollAndZoomIntoView([root]);
    console.log("✅ Dashboard V5 criado com sucesso!");

} catch(e) { console.error("❌ Crash V5:", e); throw e; }
})();
"""

if __name__ == "__main__":
    disparar_para_figma("DASHBOARD V5 — Auto-contido, cores hardcoded", V5_PAYLOAD)
