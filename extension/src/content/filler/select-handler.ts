/**
 * select-handler.ts
 * Preenche <select>, radio buttons e checkboxes.
 * Faz matching fuzzy para encontrar a opção mais próxima do valor desejado.
 */

/**
 * Normaliza string para comparação (lowercase, sem acentos, sem espaços extras).
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score de similaridade simples entre dois strings normalizados.
 * Retorna 0–1 (1 = match perfeito).
 */
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Interseção de palavras
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  if (intersection.length > 0) {
    return intersection.length / Math.max(wordsA.size, wordsB.size) * 0.8;
  }

  return 0;
}

/**
 * Preenche um <select> com o valor mais próximo ao desejado.
 */
export function fillSelect(selectEl: HTMLSelectElement, value: string): boolean {
  try {
    const options = Array.from(selectEl.options);
    let bestOption: HTMLOptionElement | null = null;
    let bestScore = 0;

    for (const opt of options) {
      if (opt.disabled || opt.value === '' || opt.value === null) continue;

      // Testar por value e por text
      const scoreValue = similarity(value, opt.value);
      const scoreText = similarity(value, opt.text);
      const score = Math.max(scoreValue, scoreText);

      if (score > bestScore) {
        bestScore = score;
        bestOption = opt;
      }
    }

    if (!bestOption || bestScore < 0.4) return false;

    // Aplicar seleção via native setter
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value'
    )?.set;

    selectEl.focus();
    if (nativeSetter) {
      nativeSetter.call(selectEl, bestOption.value);
    } else {
      selectEl.value = bestOption.value;
    }

    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    selectEl.dispatchEvent(new Event('blur', { bubbles: true }));

    return true;
  } catch (err) {
    console.warn('[Vagato] fillSelect falhou:', err);
    return false;
  }
}

/**
 * Preenche um combobox React Select (input[role="combobox"]).
 * Simula digitação → aguarda dropdown → clica na primeira opção.
 * Necessário para react-select, downshift e similares.
 */
export async function fillReactSelectCombobox(
  input: HTMLInputElement,
  value: string
): Promise<boolean> {
  try {
    // 1. Focar e abrir o dropdown
    input.focus();
    input.click();

    // 2. Digitar o valor para filtrar as opções
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    if (nativeSetter) nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // 3. Aguardar dropdown renderizar (react-select tem delay)
    await new Promise((r) => setTimeout(r, 400));

    // 4. Buscar listbox renderizado
    const listbox =
      document.querySelector('[role="listbox"]') ||
      document.querySelector('.select__menu-list') ||
      document.querySelector('[class*="menu-list"]');

    if (listbox) {
      const firstOpt =
        listbox.querySelector('[role="option"]') ||
        listbox.querySelector('[class*="option"]');
      if (firstOpt) {
        (firstOpt as HTMLElement).click();
        return true;
      }
    }

    // 5. Fallback: ArrowDown + Enter
    input.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', keyCode: 40 })
    );
    await new Promise((r) => setTimeout(r, 100));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 })
    );

    return true;
  } catch (err) {
    console.warn('[Vagato] fillReactSelectCombobox falhou:', err);
    return false;
  }
}

/**
 * Seleciona o radio button que melhor corresponde ao valor.
 */
export function fillRadio(
  radios: NodeListOf<HTMLInputElement> | HTMLInputElement[],
  value: string
): boolean {
  try {
    const radioList = Array.from(radios);
    let bestRadio: HTMLInputElement | null = null;
    let bestScore = 0;

    for (const radio of radioList) {
      if (radio.disabled) continue;

      const scoreValue = similarity(value, radio.value);
      // Também verificar o label associado
      const label = document.querySelector<HTMLLabelElement>(`label[for="${radio.id}"]`);
      const labelText = label?.textContent?.trim() || '';
      const scoreLabel = similarity(value, labelText);
      const score = Math.max(scoreValue, scoreLabel);

      if (score > bestScore) {
        bestScore = score;
        bestRadio = radio;
      }
    }

    if (!bestRadio || bestScore < 0.4) return false;

    const nativeCheckedSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'checked'
    )?.set;

    bestRadio.focus();
    if (nativeCheckedSetter) {
      nativeCheckedSetter.call(bestRadio, true);
    } else {
      bestRadio.checked = true;
    }

    bestRadio.dispatchEvent(new Event('change', { bubbles: true }));
    bestRadio.dispatchEvent(new Event('click', { bubbles: true }));

    return true;
  } catch (err) {
    console.warn('[Vagato] fillRadio falhou:', err);
    return false;
  }
}

/**
 * Marca ou desmarca checkboxes que correspondem aos valores.
 */
export function fillCheckbox(checkbox: HTMLInputElement, value: string): boolean {
  try {
    const valueNorm = normalize(value);
    const checkNorm = normalize(checkbox.value);
    const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${checkbox.id}"]`);
    const labelNorm = normalize(labelEl?.textContent || '');

    const shouldCheck =
      valueNorm === checkNorm ||
      valueNorm === labelNorm ||
      valueNorm.includes(checkNorm) ||
      valueNorm.includes(labelNorm) ||
      ['sim', 'yes', 'true', '1'].includes(valueNorm);

    const nativeCheckedSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'checked'
    )?.set;

    if (nativeCheckedSetter) {
      nativeCheckedSetter.call(checkbox, shouldCheck);
    } else {
      checkbox.checked = shouldCheck;
    }

    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch (err) {
    console.warn('[Vagato] fillCheckbox falhou:', err);
    return false;
  }
}
