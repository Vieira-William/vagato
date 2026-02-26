# QA - Pendencias e Melhorias

**Data:** 2026-02-14
**Score Geral:** 92% (33/36 itens funcionando)

---

## IMPLEMENTADO HOJE (2026-02-14)

### Melhorias no Scraper de LinkedIn Posts

| # | Feature | Status |
|---|---------|--------|
| 1 | Campo `whatsapp_contato` no backend | ✅ Implementado |
| 2 | Campo `link_post_original` no backend | ✅ Implementado |
| 3 | Função `extrair_whatsapp()` | ✅ Implementado |
| 4 | Função `detectar_repost()` para identificar autor original | ✅ Implementado |
| 5 | Filtro de links irrelevantes (blacklist/whitelist) | ✅ Implementado |
| 6 | Função `eh_post_multi_vaga()` e `extrair_link_vaga_ux()` | ✅ Implementado |
| 7 | AI Extractor com campo `wpp` (WhatsApp) | ✅ Implementado |
| 8 | Botão WhatsApp no VagaCard | ✅ Implementado |
| 9 | Link do post original no VagaCard (ícone Link2) | ✅ Implementado |
| 10 | Fix Headless mode - browser não abre mais visualmente | ✅ Implementado |

### Arquivos Modificados
- `backend/app/models.py` - +whatsapp_contato, +link_post_original
- `backend/app/schemas.py` - +whatsapp_contato, +link_post_original
- `backend/app/migrations/add_ai_fields.py` - +novas colunas
- `backend/app/scrapers/linkedin_posts.py` - +7 novas funções
- `backend/app/services/ai_extractor.py` - +campo wpp no prompt
- `frontend/src/components/VagaCard.jsx` - +botão WhatsApp, +link post original
- `backend/app/scrapers/login_helper.py` - headless=True como default

---

## PENDENCIAS CRITICAS (4 itens)

### 1. Upload de Curriculo - Backend
- **Arquivo:** `backend/app/api/profile.py` linha ~161
- **Problema:** Endpoint aceita arquivo mas nao faz parsing de PDF
- **Solucao:** Implementar com pdfplumber ou PyPDF2
```python
import pdfplumber

async def parse_pdf(file_path: str) -> dict:
    with pdfplumber.open(file_path) as pdf:
        text = "\n".join(page.extract_text() for page in pdf.pages)
    # Usar AI para extrair skills do texto
    return {"skills": extracted_skills, "experiencia": anos}
```

### 2. Upload de Curriculo - Frontend
- **Arquivo:** `frontend/src/pages/Perfil.jsx` linha ~414
- **Problema:** UI existe mas logica tem `TODO`
- **Solucao:**
```javascript
const handleUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await profileService.uploadCurriculo(formData);
  // Atualizar perfil com dados extraidos
  setPerfil(prev => ({ ...prev, ...response.data }));
};
```

### 3. Campo missao_vaga nao populado
- **Problema:** 0/109 vagas tem esse campo preenchido
- **Causa:** Vagas coletadas antes do prompt atualizado
- **Solucao:** Re-executar scraper ou aguardar novas coletas

### 4. Campo como_aplicar nao populado
- **Problema:** 0/109 vagas tem esse campo preenchido
- **Causa:** Vagas coletadas antes do prompt atualizado
- **Solucao:** Re-executar scraper ou aguardar novas coletas

---

## MELHORIAS SUGERIDAS

### Prioridade Alta

| # | Melhoria | Arquivo | Esforco |
|---|----------|---------|---------|
| 1 | Loading state no botao favorito | VagaCard.jsx | Baixo |
| 2 | Toast ao favoritar/desfavoritar | VagaCard.jsx | Baixo |
| 3 | Persistir tab selecionada no localStorage | Dashboard.jsx | Baixo |

### Prioridade Media

| # | Melhoria | Arquivo | Esforco |
|---|----------|---------|---------|
| 4 | Filtro de data no Dashboard | Dashboard.jsx | Medio |
| 5 | Skeleton loading nos cards | VagaCard.jsx | Medio |
| 6 | Export vagas favoritas para CSV | Dashboard.jsx | Medio |

### Prioridade Baixa

| # | Melhoria | Arquivo | Esforco |
|---|----------|---------|---------|
| 7 | Animacao no toggle de status | VagaCard.jsx | Baixo |
| 8 | Atalhos de teclado (J/K navegacao) | Dashboard.jsx | Medio |
| 9 | Dark/Light mode toggle | Layout.jsx | Medio |

---

## CHECKLIST DE VERIFICACAO

### Backend Endpoints
- [x] GET /api/stats/
- [x] GET /api/vagas/
- [x] PATCH /api/vagas/{id}
- [x] POST /api/vagas/{id}/favoritar
- [x] GET /api/profile/
- [x] PATCH /api/profile/
- [ ] POST /api/profile/upload-curriculo (parsing)
- [x] GET /api/search-urls/
- [x] POST /api/search-urls/
- [x] DELETE /api/search-urls/{id}
- [x] GET /api/config/match-weights
- [x] POST /api/config/match-weights

### Frontend Components
- [x] VagaCard - Favorito top-right
- [x] VagaCard - Titulo separado
- [x] VagaCard - Empresa separada
- [x] VagaCard - Localizacao com truncate
- [x] VagaCard - TagsRow overflow
- [x] VagaCard - StatusToggle
- [x] VagaCard - ScoreBreakdown
- [x] VagaCard - Ghost buttons
- [x] Dashboard - Tab Favoritos
- [x] Perfil - Formulario completo
- [ ] Perfil - Upload funcional
- [x] Configuracoes - Search URLs
- [x] Configuracoes - Match Weights
- [x] Sidebar - Link /perfil

### Dados
- [x] is_favorito no schema
- [x] missao_vaga no schema
- [x] como_aplicar no schema
- [ ] missao_vaga populado (0/109)
- [ ] como_aplicar populado (0/109)

---

## NOTAS TECNICAS

### Dependencias a instalar para parsing PDF
```bash
pip install pdfplumber
# ou
pip install PyPDF2
```

### Comando para re-processar vagas existentes
```bash
curl -X POST "http://localhost:8000/api/scraper/reprocessar-todas"
```

### Arquivos principais modificados neste projeto
- `backend/app/models.py` - campos missao_vaga, como_aplicar, is_favorito
- `backend/app/schemas.py` - schemas atualizados
- `backend/app/api/vagas.py` - endpoint favoritar
- `backend/app/api/profile.py` - CRUD perfil
- `backend/app/api/search_urls.py` - CRUD URLs
- `backend/app/services/ai_extractor.py` - prompt com ms/ap
- `frontend/src/components/VagaCard.jsx` - redesign completo
- `frontend/src/pages/Dashboard.jsx` - tab favoritos
- `frontend/src/pages/Perfil.jsx` - pagina nova
- `frontend/src/pages/Configuracoes.jsx` - URLs + Weights
- `frontend/src/services/api.js` - novos services
