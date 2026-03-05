/**
 * profile-mapper.ts
 * Mapeia campos do perfil Vagato para campos de formulários de candidatura.
 * Suporta 20+ campos com aliases multilíngues.
 */

import type { VagatoProfile, MappedField, OpenQuestion, DetectedField } from './types';

// ── Tipo de campo de formulário ────────────────────────────────────────────
export type FieldType =
  | 'text' | 'email' | 'tel' | 'url' | 'textarea'
  | 'select' | 'radio' | 'checkbox' | 'number' | 'date';

export interface ProfileField {
  key: string;               // chave no perfil Vagato
  getValue: (p: VagatoProfile) => string | null;
  fieldType: FieldType;
}

// ── Mapa principal: campo semântico → extrator de valor ───────────────────
const PROFILE_FIELDS: ProfileField[] = [
  // Dados pessoais
  {
    key: 'full_name',
    getValue: (p) => p.nome || null,
    fieldType: 'text',
  },
  {
    key: 'first_name',
    getValue: (p) => {
      if (p.primeiro_nome) return p.primeiro_nome;
      if (!p.nome) return null;
      return p.nome.split(' ')[0];
    },
    fieldType: 'text',
  },
  {
    key: 'last_name',
    getValue: (p) => {
      if (p.ultimo_nome) return p.ultimo_nome;
      if (!p.nome) return null;
      const parts = p.nome.split(' ');
      return parts.length > 1 ? parts.slice(1).join(' ') : null;
    },
    fieldType: 'text',
  },
  {
    key: 'email',
    getValue: (p) => p.email || null,
    fieldType: 'email',
  },
  {
    key: 'phone',
    getValue: (p) => p.telefone || null,
    fieldType: 'tel',
  },
  {
    key: 'linkedin',
    getValue: (p) => p.linkedin_url || null,
    fieldType: 'url',
  },
  {
    key: 'portfolio',
    getValue: (p) => p.portfolio_url || null,
    fieldType: 'url',
  },
  {
    key: 'github',
    getValue: (p) => p.github_url || null,
    fieldType: 'url',
  },

  // Profissional
  {
    key: 'job_title',
    getValue: (p) => {
      if (p.profissao) return p.profissao;
      if (p.profissoes_interesse && p.profissoes_interesse.length > 0) {
        return (p.profissoes_interesse[0] as unknown as Record<string, string>).titulo || null;
      }
      return null;
    },
    fieldType: 'text',
  },
  {
    key: 'years_experience',
    getValue: (p) => (p.experiencia_anos != null ? String(p.experiencia_anos) : null),
    fieldType: 'number',
  },
  {
    key: 'skills',
    getValue: (p) => {
      const skills = p.skills_prioritarias?.length ? p.skills_prioritarias : p.skills;
      return skills?.join(', ') || null;
    },
    fieldType: 'text',
  },

  // Localização
  {
    key: 'country',
    getValue: (p) => p.pais || null,
    fieldType: 'text',
  },
  {
    key: 'state',
    getValue: (p) => p.estado || null,
    fieldType: 'text',
  },
  {
    key: 'city',
    getValue: (p) => p.cidade || null,
    fieldType: 'text',
  },
  {
    key: 'zip_code',
    getValue: (p) => p.cep || null,
    fieldType: 'text',
  },

  // Formação
  {
    key: 'education_level',
    getValue: (p) => {
      if (!p.formacoes || p.formacoes.length === 0) return null;
      const f = p.formacoes[p.formacoes.length - 1] as unknown as Record<string, string>;
      return f.nivel || f.grau || null;
    },
    fieldType: 'select',
  },
  {
    key: 'institution',
    getValue: (p) => {
      if (!p.formacoes || p.formacoes.length === 0) return null;
      const f = p.formacoes[p.formacoes.length - 1] as unknown as Record<string, string>;
      return f.instituicao || f.institution || null;
    },
    fieldType: 'text',
  },
  {
    key: 'degree',
    getValue: (p) => {
      if (!p.formacoes || p.formacoes.length === 0) return null;
      const f = p.formacoes[p.formacoes.length - 1] as unknown as Record<string, string>;
      return f.curso || f.degree || null;
    },
    fieldType: 'text',
  },

  // Idiomas
  {
    key: 'english_level',
    getValue: (p) => {
      if (p.nivel_ingles) return p.nivel_ingles;
      if (!p.idiomas || p.idiomas.length === 0) return null;
      const eng = (p.idiomas as unknown as Record<string, string>[]).find(
        (i) => i['idioma']?.toLowerCase().includes('ingl') || i['language']?.toLowerCase().includes('engl')
      );
      return eng?.['nivel'] || eng?.['level'] || null;
    },
    fieldType: 'select',
  },

  // Preferências
  {
    key: 'work_model',
    getValue: (p) => p.modelos_trabalho?.[0] || null,
    fieldType: 'select',
  },
  {
    key: 'contract_type',
    getValue: (p) => p.tipos_contrato?.[0] || null,
    fieldType: 'select',
  },
  {
    key: 'salary_expectation',
    getValue: (p) => {
      if (p.salario_minimo != null) return String(Math.round(p.salario_minimo));
      return null;
    },
    fieldType: 'number',
  },
];

// ── Aliases: variante de nome → chave semântica ───────────────────────────
// Cada array contém padrões (lowercase) que mapeiam para uma chave semântica.
export const FIELD_ALIASES: Record<string, string[]> = {
  full_name: [
    'fullname', 'full_name', 'full-name', 'nome completo', 'nome', 'name',
    'candidate_name', 'candidato', 'applicant_name', 'your name',
  ],
  first_name: [
    'firstname', 'first_name', 'first-name', 'primeiro nome', 'primeiro',
    'given name', 'given_name', 'fname', 'first name',
  ],
  last_name: [
    'lastname', 'last_name', 'last-name', 'sobrenome', 'surname',
    'family name', 'family_name', 'lname', 'last name',
  ],
  email: [
    'email', 'e-mail', 'email address', 'endereço de email', 'e_mail',
    'emailaddress', 'contact email', 'seu email',
  ],
  phone: [
    'phone', 'telefone', 'celular', 'mobile', 'tel', 'phone number',
    'phonenumber', 'numero de telefone', 'contato', 'whatsapp',
    'phone_number', 'mobile_number',
  ],
  linkedin: [
    'linkedin', 'linkedin url', 'linkedin profile', 'perfil linkedin',
    'linkedin_url', 'linkedinurl', 'linkedin profile url',
  ],
  portfolio: [
    'portfolio', 'portfólio', 'portfolio url', 'website', 'site pessoal',
    'personal website', 'personal_website', 'portfolio_url',
  ],
  github: [
    'github', 'github url', 'github profile', 'github_url', 'githuburl',
  ],
  job_title: [
    'cargo', 'cargo desejado', 'job title', 'jobtitle', 'título',
    'position', 'role', 'função', 'occupation', 'profissão',
    'current_title', 'desired_role',
  ],
  years_experience: [
    'anos de experiência', 'anos experiencia', 'years of experience',
    'experience years', 'experiencia', 'anos', 'years_experience',
    'years experience', 'how many years',
  ],
  skills: [
    'skills', 'habilidades', 'competências', 'competencias',
    'tecnologias', 'technologies', 'tech skills', 'technical skills',
  ],
  country: [
    'país', 'pais', 'country', 'nationality', 'nacionalidade',
    'país de residência', 'country of residence',
  ],
  state: [
    'estado', 'state', 'province', 'região', 'uf',
  ],
  city: [
    'cidade', 'city', 'localização', 'location', 'municipality',
  ],
  zip_code: [
    'cep', 'zip', 'zipcode', 'zip code', 'postal code', 'postalcode',
    'código postal',
  ],
  education_level: [
    'escolaridade', 'nível de escolaridade', 'grau de instrução',
    'education level', 'education', 'formação', 'degree level',
    'highest education', 'highest_education',
  ],
  institution: [
    'instituição', 'universidade', 'faculdade', 'escola', 'institution',
    'university', 'college', 'school', 'institution_name',
  ],
  degree: [
    'curso', 'graduação', 'degree', 'major', 'field of study',
    'area de estudo', 'degree_name',
  ],
  english_level: [
    'inglês', 'ingles', 'english', 'english level', 'nível de inglês',
    'nivel de ingles', 'english proficiency', 'english_level',
  ],
  work_model: [
    'modelo de trabalho', 'work model', 'remote', 'remoto', 'híbrido',
    'presencial', 'modalidade', 'work type', 'work arrangement',
  ],
  contract_type: [
    'tipo de contrato', 'contract type', 'clt', 'pj', 'freelance',
    'employment type', 'contract_type', 'tipo contrato',
  ],
  salary_expectation: [
    'pretensão salarial', 'salário', 'salary', 'salary expectation',
    'expected salary', 'desired salary', 'remuneração', 'compensation',
    'salario pretendido', 'ctc expected',
  ],
};

// ── Função principal: mapear campos detectados → valores do perfil ─────────
export function mapProfileToFields(
  detectedFields: DetectedField[],
  profile: VagatoProfile
): { mapped: MappedField[]; questions: OpenQuestion[] } {
  const mapped: MappedField[] = [];
  const questions: OpenQuestion[] = [];

  for (const field of detectedFields) {
    // Campo já tem chave semântica identificada pela detecção
    const semanticKey = field.semanticKey;
    if (!semanticKey) {
      // Campo sem classificação → pergunta aberta se for textarea
      if (field.element.tagName === 'TEXTAREA' || field.fieldType === 'textarea') {
        questions.push({
          element: field.element,
          label: field.label || 'Campo sem rótulo',
          placeholder: (field.element as HTMLInputElement).placeholder || '',
          confidence: field.confidence,
        });
      }
      continue;
    }

    // Encontrar o ProfileField correspondente
    const profileField = PROFILE_FIELDS.find((pf) => pf.key === semanticKey);
    if (!profileField) continue;

    const value = profileField.getValue(profile);
    if (value === null || value === '') {
      // Perfil não tem esse dado → pular (sem inventar)
      continue;
    }

    mapped.push({
      element: field.element,
      semanticKey,
      value,
      label: field.label || semanticKey,
      confidence: field.confidence,
      fieldType: profileField.fieldType,
      originalField: field,
    });
  }

  return { mapped, questions };
}

// ── Utilitário: encontrar chave semântica a partir de texto ───────────────
export function resolveSemanticKey(text: string): string | null {
  const normalized = text.toLowerCase().trim()
    .replace(/[*:()\[\]]/g, '')
    .replace(/\s+/g, ' ');

  // Longest-match: retorna a chave cujo alias mais longo corresponde.
  // Evita que aliases curtos (ex: 'name') engolam labels específicos ('last name').
  let bestKey: string | null = null;
  let bestLen = 0;

  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if ((normalized === alias || normalized.includes(alias)) && alias.length > bestLen) {
        bestKey = key;
        bestLen = alias.length;
      }
    }
  }
  return bestKey;
}
