/**
 * Tipos compartilhados entre popup, service worker e content script.
 */

// ── Perfil Vagato (cache local) ──────────────────────────────────

export interface VagatoProfile {
  id: number;
  nome: string;
  primeiro_nome: string | null;
  nome_meio: string | null;
  ultimo_nome: string | null;
  email: string | null;
  telefone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  profissao: string | null;

  // Profissional
  profissoes_interesse: ProfissaoInteresse[];
  experiencia_anos: number | null;
  skills: string[];
  skills_prioritarias: string[];
  formacoes: Formacao[];
  idiomas: Idioma[];
  nivel_ingles: string | null;

  // Preferências
  modelos_trabalho: string[];
  tipos_contrato: string[];
  salario_minimo: number | null;
  salario_maximo: number | null;
  salario_moeda: string | null;

  // Localização
  pais: string | null;
  estado: string | null;
  cidade: string | null;
  cep: string | null;

  // CVs
  arquivos_curriculo: ArquivoCurriculo[];

  // Metadados
  onboarding_completed: boolean;
}

export interface ProfissaoInteresse {
  titulo: string;
  nivel: string;
  anos_exp?: number;
}

export interface Formacao {
  grau: string;
  curso: string;
  instituicao: string;
  status: string;
}

export interface Idioma {
  idioma: string;
  proficiencia: string;
}

export interface ArquivoCurriculo {
  id: string;
  nome: string;
  data_upload?: string;
  tamanho?: number;
}

// ── Auth ─────────────────────────────────────────────────────────

export interface AuthState {
  token: string | null;
  email: string | null;
  profileId: number | null;
  expiresAt: string | null;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  profile_id: number;
  email: string;
}

// ── Detecção de Campos (Fase 2) ──────────────────────────────────

export type FieldType =
  | 'text' | 'email' | 'tel' | 'url' | 'textarea'
  | 'select' | 'radio' | 'checkbox' | 'number' | 'date';

export interface DetectedField {
  element: HTMLElement;
  semanticKey: string | null;    // chave semântica (ex: 'email', 'phone', 'full_name')
  label: string;                 // texto do label/placeholder para exibição
  confidence: number;            // 0–1 (confiança combinada Layer1+Layer2)
  fieldType: FieldType;          // tipo de campo
  needsAI: boolean;              // requer Layer 3 (confiança < threshold)
  alreadyFilled: boolean;        // campo já tem valor
  source: string;                // origem do match ('autocomplete', 'label[for]', etc.)
}

export interface MappedField {
  element: HTMLElement;          // elemento DOM a preencher
  semanticKey: string;           // chave semântica confirmada
  value: string;                 // valor do perfil a usar
  label: string;                 // label para exibição no ReviewPanel
  confidence: number;            // confiança da detecção
  fieldType: FieldType;          // tipo para seleção do filler correto
  originalField: DetectedField;  // referência ao campo detectado
}

export interface OpenQuestion {
  element: HTMLElement;          // textarea do formulário
  label: string;                 // texto da pergunta
  placeholder: string;           // placeholder do campo
  confidence: number;            // confiança da detecção
  aiAnswer?: string;             // resposta gerada pela Layer 3
}

// ── Extension Log ────────────────────────────────────────────────

export interface ExtensionEvent {
  event: string;
  site?: string;
  fields_filled?: number;
  ai_calls?: number;
  metadata?: Record<string, unknown>;
}
