# RELATÓRIO DE QA INTENSIVO - SISTEMA DE COLETA DE VAGAS UX/PRODUTO

**Data:** 2026-02-20
**Versão:** 1.0
**Ambiente:** LinkedIn Posts (coleta bruta → análise)

---

## SUMÁRIO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Posts brutos coletados | 30 |
| Vagas extraídas | 20 |
| Taxa de conversão | 66.7% |
| Testes executados | 12 |
| Testes que passaram | 8 (66.7%) |
| Testes que falharam | 4 |
| Warnings | 5 |

### Classificação Geral: ⚠️ ATENÇÃO NECESSÁRIA

---

## 1. PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1.1 Títulos Genéricos/Truncados (ALTA PRIORIDADE)

**Problema:** 7 vagas com título "Designer" (35% do total)

**Causa raiz:** A função `extrair_titulo_vaga()` em `analisar_brutos.py` está falhando em extrair o título completo quando:
- O post contém múltiplas vagas listadas
- O título está no meio do texto, não no início
- O padrão regex não captura títulos compostos

**Exemplos de títulos problemáticos:**
| Título Extraído | Link | Título Esperado |
|----------------|------|-----------------|
| "Designer" | lnkd.in/dhTwQu-w | "UX/UI Designer Jr" |
| "Designer" | lnkd.in/d8mf729k | "Designer UX/UI Jr" ou "Product Owner" |
| "Dele Est" | lnkd.in/d8mf729k | Título corrompido/truncado |

**Impacto:**
- Usuário não consegue identificar a vaga corretamente
- Vagas duplicadas são tratadas como únicas (mesmo título genérico)
- Dificulta a busca e filtro

**Recomendação:**
```python
# Melhorar padrões de regex para capturar títulos mais específicos
# Priorizar linhas que contêm cargo + nível (Jr, Pleno, Sênior)
# Ex: "UX Designer Remoto" ao invés de "Designer"
```

---

### 1.2 Extração de Empresa Insuficiente (ALTA PRIORIDADE)

**Problema:** Apenas 25% das vagas (5/20) têm empresa preenchida

**Causa raiz:** A função `extrair_empresa()` busca apenas padrões como:
- `@empresa`
- `na empresa`
- `at empresa`

**Mas não captura:**
- Empresa mencionada no perfil do autor
- Empresa em hashtags (#BuscaDeVagas #Empresa)
- Empresa no nome do autor (ex: "Andressa Souza na Qintess")

**Impacto:**
- Usuário não sabe onde é a vaga
- Não consegue filtrar por empresa
- Duplicatas não são detectadas corretamente

**Recomendação:**
```python
# Extrair empresa da bio do autor quando disponível
# Buscar padrões: "na EMPRESA", "at EMPRESA", "@EMPRESA"
# Extrair de "Analista na EMPRESA" no perfil
```

---

### 1.3 Possíveis Falsos Negativos (MÉDIA PRIORIDADE)

**Problema:** 8 posts parecem ser vagas mas não foram extraídos

**Exemplos de posts ignorados:**

| ID | Texto Preview | Motivo Provável |
|----|---------------|-----------------|
| 6 | "Quem desenvolve um produto sabe..." | Não é vaga, é conteúdo sobre produto |
| 7 | "🚀 VAGA \| Desenvolvedor(a) JAVA FullStack" | Vaga de DEV, não de UX |
| 11 | "Vamos falar de site de carreiras?" | Conteúdo sobre UX, não vaga |
| 12 | "🚀 Vaga: Analista de Negócios / Requisitos" | Vaga de negócios, menciona UX como requisito |
| 15 | "🚀 Vaga Aberta \| SAP HCM Sênior" | Vaga de SAP, empresa "UX Innovation" |

**Análise:**
- 4/8 são corretamente ignorados (não são vagas de UX/Produto)
- 1/8 é falso negativo real (SAP HCM na empresa "UX Innovation" confunde o filtro)
- 3/8 são questionáveis (mencionam UX mas são vagas de outras áreas)

**Impacto:** Baixo - o filtro está sendo mais conservador, o que é preferível a incluir vagas erradas.

---

### 1.4 Correspondência Link ↔ Título (MÉDIA PRIORIDADE)

**Problema:** Os links `lnkd.in` não estão sendo expandidos para validação

**Observações:**
- 100% dos links testados retornaram status 200
- Links encurtados `lnkd.in` não redirecionam via HEAD request (precisam de navegador)
- Não é possível validar automaticamente se o link corresponde ao título

**Exemplos:**
| Título | Link Original | Validação |
|--------|---------------|-----------|
| "Ux Designer Remoto" | lnkd.in/d-YyQT-T | ⚠️ Não validado (não expande) |
| "BOOTCAMP EXCLUSIVO" | lnkd.in/d9Et26Fp | ✅ Expande para nerdin.com.br/vagas |

**Impacto:**
- Não temos garantia de que os links realmente levam para vagas UX
- Links podem levar para vagas de outras áreas

**Recomendação:**
- Usar requests com `GET` ao invés de `HEAD` para expandir lnkd.in
- Ou usar Selenium para expandir os links durante a coleta

---

## 2. PROBLEMAS MENORES

### 2.1 Títulos Duplicados

**Estatísticas:**
- "Designer": 7 ocorrências (35%)
- "Ux Designer Remoto": 2 ocorrências (10%)
- "Ux Designer": 2 ocorrências (10%)

**Total:** 55% das vagas têm títulos duplicados

**Causa:** Títulos genéricos geram duplicatas falsas

---

### 2.2 Perfil do Autor Inconsistente

**Estatísticas:**
- 80% das vagas têm `perfil_autor` preenchido
- 70% têm `nome_autor` preenchido

**Problema:** O perfil capturado às vezes não é do autor real do post (captura perfil de outro post próximo)

---

## 3. MÉTRICAS DE COBERTURA

### 3.1 Cobertura de Campos

| Campo | Preenchidos | Taxa |
|-------|-------------|------|
| titulo | 20/20 | 100% |
| empresa | 5/20 | 25% |
| tipo_vaga | 20/20 | 100% |
| link_vaga | 20/20 | 100% |
| modalidade | 20/20 | 100% |
| forma_contato | 20/20 | 100% |
| perfil_autor | 16/20 | 80% |
| nome_autor | 14/20 | 70% |

### 3.2 Distribuição de Formas de Contato

| Forma | Quantidade | % |
|-------|------------|---|
| link | 20 | 100% |
| email | 0 | 0% |
| mensagem | 0 | 0% |
| whatsapp | 0 | 0% |

**Observação:** Todas as vagas têm link. Emails e WhatsApps não estão sendo extraídos.

---

## 4. TESTES QUE DEVEM SER IMPLEMENTADOS

### 4.1 Testes de Validação de Links (Crítico)

```python
def testar_link_expande_para_vaga():
    """
    Para cada link lnkd.in:
    1. Fazer GET request (não HEAD)
    2. Verificar se URL final contém keywords de vagas
    3. Verificar se domínio é plataforma conhecida
    """
    pass

def testar_link_corresponde_titulo():
    """
    Para cada vaga:
    1. Expandir link
    2. Fazer scrape da página destino
    3. Verificar se título da página contém termos do título da vaga
    """
    pass
```

### 4.2 Testes de Qualidade de Extração (Alto)

```python
def testar_titulo_nao_generico():
    """
    Títulos não podem ser:
    - Apenas "Designer" (sem especificação)
    - Menos de 10 caracteres
    - Truncados (terminar com "...")
    """
    pass

def testar_empresa_extraida():
    """
    Para posts que mencionam empresa:
    - Verificar se empresa foi extraída
    - Taxa mínima aceitável: 50%
    """
    pass
```

### 4.3 Testes de Integridade de Dados (Médio)

```python
def testar_sem_duplicatas_por_link():
    """Dois registros não podem ter mesmo link_vaga"""
    pass

def testar_modalidade_consistente():
    """
    Se texto contém 'remoto', modalidade deve ser 'remoto'
    Se texto contém 'híbrido', modalidade deve ser 'hibrido'
    """
    pass
```

### 4.4 Testes de Filtro UX/Produto (Médio)

```python
def testar_falsos_positivos():
    """
    Vagas extraídas devem realmente ser de UX/Produto:
    - Não dev backend
    - Não analista de dados
    - Não designer gráfico (não UX)
    """
    pass

def testar_termos_no_titulo():
    """
    Título ou tipo_vaga deve conter:
    - ux, ui, product, designer, design, etc.
    """
    pass
```

### 4.5 Testes de Regressão (Baixo)

```python
def testar_formato_data():
    """data_coleta deve estar no formato ISO YYYY-MM-DD"""
    pass

def testar_links_validos():
    """link_vaga deve começar com http ou https"""
    pass
```

---

## 5. MATRIZ DE PRIORIZAÇÃO

| Problema | Impacto | Esforço | Prioridade |
|----------|---------|---------|------------|
| Títulos genéricos | Alto | Médio | 🔴 P1 |
| Empresa não extraída | Alto | Médio | 🔴 P1 |
| Links lnkd.in não validados | Médio | Alto | 🟡 P2 |
| Títulos duplicados | Médio | Baixo | 🟡 P2 |
| Falsos negativos | Baixo | Alto | 🟢 P3 |
| Perfil autor incorreto | Baixo | Médio | 🟢 P3 |

---

## 6. PRÓXIMOS PASSOS RECOMENDADOS

### Curto Prazo (P1 - Esta Sprint)

1. **Melhorar extração de títulos:**
   - Adicionar padrões para "UX Designer Jr", "Product Designer Pleno", etc.
   - Evitar fallback para "Designer" ou "Product Designer" genérico
   - Usar NLP básico para detectar cargo no texto

2. **Melhorar extração de empresa:**
   - Extrair da bio do autor (ex: "Tech Recruiter na Qintess")
   - Buscar hashtags de empresas
   - Extrair do corpo do post com padrões melhores

### Médio Prazo (P2 - Próximas 2 Sprints)

3. **Expandir links lnkd.in:**
   - Usar Selenium para expandir links encurtados
   - Capturar URL final durante coleta bruta
   - Validar que URL final é plataforma de vagas

4. **Deduplicação inteligente:**
   - Não apenas por link, mas por similaridade de texto
   - Comparar posts por hash do conteúdo

### Longo Prazo (P3 - Backlog)

5. **Implementar IA para extração:**
   - Usar GPT/Claude para extrair título, empresa, requisitos
   - Classificar se é vaga de UX/Produto com mais precisão

6. **Testes automatizados:**
   - Implementar todos os testes listados na seção 4
   - Rodar em CI/CD antes de cada deploy

---

## 7. REFERÊNCIAS

- [Zyte: Validation Techniques for Web Scraping](https://www.zyte.com/blog/guide-to-web-data-extraction-qa-validation-techniques/)
- [Scrapfly: How to Ensure Web Scraped Data Quality](https://scrapfly.io/blog/posts/how-to-ensure-web-scrapped-data-quality)
- [Generect: LinkedIn Scraping Best Practices](https://generect.com/blog/linkedin-scraping/)

---

## APÊNDICE A: Dados Brutos do Teste

**Arquivo:** `posts_2026-02-20_033652.json`
**Localização:** `backend/data/brutos/`
**Posts coletados:** 30
**Scrolls realizados:** 6
**Tempo de coleta:** ~30 segundos

### Amostra de Vagas Extraídas (5 primeiras):

| # | Título | Empresa | Tipo | Link | Contato |
|---|--------|---------|------|------|---------|
| 1 | Ux Designer Remoto | - | UX Designer | lnkd.in/d-YyQT-T | link |
| 2 | Afirmativa Para Pessoas... | - | UI Designer | lnkd.in/dhTwQu-w | link |
| 3 | Designer | - | Product Manager | lnkd.in/dhTwQu-w | link |
| 4 | Designer | - | Product Manager | lnkd.in/dhTwQu-w | link |
| 5 | Vale A Pena | - | Product Designer | lnkd.in/dmskrZgb | link |

---

**Relatório gerado automaticamente por:** `tests/qa_report.py`
**Próxima revisão recomendada:** Após implementação das correções P1
