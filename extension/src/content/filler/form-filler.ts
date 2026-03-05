/**
 * form-filler.ts
 * Engine principal de preenchimento.
 * Orquestra native-input e select-handler para cada MappedField.
 * NUNCA submete formulários (R1 do PRD).
 */

import type { MappedField } from '../../shared/types';
import { fillInput } from './native-input';
import { fillSelect, fillRadio, fillCheckbox, fillReactSelectCombobox } from './select-handler';

export interface FillResult {
  semanticKey: string;
  success: boolean;
  value: string;
  error?: string;
}

// Delay entre preenchimentos (ms) para simular digitação humana
const FILL_DELAY_MS = 80;

/**
 * Aguarda N milissegundos.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Preenche um único campo mapeado.
 */
async function fillSingleField(field: MappedField): Promise<FillResult> {
  const { element, semanticKey, value, fieldType } = field;

  try {
    let success = false;

    switch (fieldType) {
      case 'select': {
        if (element.tagName === 'SELECT') {
          success = fillSelect(element as HTMLSelectElement, value);
        } else if (element.getAttribute('role') === 'combobox') {
          // React Select / Downshift — precisa de simulação de typing + click
          success = await fillReactSelectCombobox(element as HTMLInputElement, value);
        } else {
          // Custom select genérico → tenta como text
          success = fillInput(element, value);
        }
        break;
      }

      case 'radio': {
        // Radios têm mesmo name → buscar todos do grupo
        const inputEl = element as HTMLInputElement;
        if (inputEl.name) {
          const group = document.querySelectorAll<HTMLInputElement>(
            `input[type="radio"][name="${inputEl.name}"]`
          );
          success = fillRadio(group, value);
        } else {
          success = fillRadio([inputEl], value);
        }
        break;
      }

      case 'checkbox': {
        success = fillCheckbox(element as HTMLInputElement, value);
        break;
      }

      case 'textarea':
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
      default: {
        success = fillInput(element, value);
        break;
      }
    }

    return { semanticKey, success, value };
  } catch (err) {
    return {
      semanticKey,
      success: false,
      value,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Preenche todos os campos mapeados em sequência (com delay).
 * NUNCA submete o formulário (R1).
 */
export async function fillAllFields(
  fields: MappedField[],
  options: { delay?: number; onProgress?: (filled: number, total: number) => void } = {}
): Promise<FillResult[]> {
  const { delay: delayMs = FILL_DELAY_MS, onProgress } = options;
  const results: FillResult[] = [];

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    // Skip campos já preenchidos (segurança extra)
    const inputEl = field.element as HTMLInputElement;
    if (inputEl.value && inputEl.value.trim().length > 0) {
      results.push({ semanticKey: field.semanticKey, success: false, value: field.value });
      continue;
    }

    const result = await fillSingleField(field);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, fields.length);
    }

    // Delay humano entre campos
    if (i < fields.length - 1) {
      await delay(delayMs);
    }
  }

  return results;
}

/**
 * Verifica se um campo foi preenchido com sucesso após o fill.
 */
export function verifyFill(field: MappedField): boolean {
  const el = field.element as HTMLInputElement;

  if (el.tagName === 'SELECT') {
    const select = el as unknown as HTMLSelectElement;
    return select.value !== '' && select.value !== null;
  }

  if (el.type === 'checkbox' || el.type === 'radio') {
    return el.checked;
  }

  return el.value !== '' && el.value !== null;
}
