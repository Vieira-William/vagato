/**
 * OverlayApp.tsx
 * Raiz React do overlay — gerencia estados do banner e painel.
 * Montado no Shadow DOM via mount.ts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FloatingBanner } from './FloatingBanner';
import { ReviewPanel } from './ReviewPanel';
import type { MappedField } from '../../shared/types';
import { fillAllFields, type FillResult } from '../filler/form-filler';

type OverlayState = 'hidden' | 'banner' | 'review' | 'filling' | 'done';

interface OverlayData {
  fieldsCount: number;
  mappedFields: MappedField[];
}

// Event bus interno: content/main.ts dispara eventos no shadowHost
const VAGATO_FIELDS_EVENT = 'vagato:fields-detected';
const VAGATO_HIDE_EVENT = 'vagato:hide';

// Guard contra race condition: showOverlay() pode ser chamado antes do React
// commitar o primeiro render (createRoot().render() é async no React 18).
// Armazenamos o dado aqui e o useEffect consome no mount.
let _pendingOverlayData: OverlayData | null = null;

export function OverlayApp() {
  const [state, setState] = useState<OverlayState>('hidden');
  const [data, setData] = useState<OverlayData>({ fieldsCount: 0, mappedFields: [] });
  const [fillResults, setFillResults] = useState<FillResult[]>([]);

  // Escuta eventos do content script via CustomEvent no document
  useEffect(() => {
    function onFieldsDetected(e: Event) {
      const ev = e as CustomEvent<OverlayData>;
      setData(ev.detail);
      setFillResults([]);
      setState('banner');
    }

    function onHide() {
      setState('hidden');
    }

    // Consumir dado pendente (race condition: showOverlay() disparou antes do mount)
    if (_pendingOverlayData) {
      setData(_pendingOverlayData);
      setFillResults([]);
      setState('banner');
      _pendingOverlayData = null;
    }

    document.addEventListener(VAGATO_FIELDS_EVENT, onFieldsDetected);
    document.addEventListener(VAGATO_HIDE_EVENT, onHide);

    return () => {
      document.removeEventListener(VAGATO_FIELDS_EVENT, onFieldsDetected);
      document.removeEventListener(VAGATO_HIDE_EVENT, onHide);
    };
  }, []);

  const handleReview = useCallback(() => {
    setState('review');
  }, []);

  const handleDismiss = useCallback(() => {
    setState('hidden');
  }, []);

  const handleClose = useCallback(() => {
    setState('banner');
  }, []);

  const handleConfirmFill = useCallback(async (fields: MappedField[]) => {
    setState('filling');
    try {
      const results = await fillAllFields(fields, {
        delay: 80,
        onProgress: () => {
          // Poderia atualizar um progresso visual aqui
        },
      });
      setFillResults(results);
      setState('done');
      // Volta ao review para mostrar resultados
      setTimeout(() => setState('review'), 200);
    } catch (err) {
      console.error('[Vagato] Erro no preenchimento:', err);
      setState('review');
    }
  }, []);

  if (state === 'hidden') return null;

  return (
    <>
      {(state === 'banner') && (
        <FloatingBanner
          fieldsCount={data.fieldsCount}
          mappedFields={data.mappedFields}
          onFill={handleConfirmFill.bind(null, data.mappedFields)}
          onReview={handleReview}
          onDismiss={handleDismiss}
        />
      )}
      {(state === 'review' || state === 'filling' || state === 'done') && (
        <ReviewPanel
          mappedFields={data.mappedFields}
          onConfirm={handleConfirmFill}
          onClose={handleClose}
          isFilling={state === 'filling'}
          fillResults={fillResults}
        />
      )}
    </>
  );
}

/**
 * Dispara evento para mostrar o banner com os campos detectados.
 * Chamado pelo content/main.ts após detecção.
 */
export function showOverlay(fieldsCount: number, mappedFields: MappedField[]): void {
  // Guardar dado pendente — caso React ainda não tenha commitado o 1º render
  _pendingOverlayData = { fieldsCount, mappedFields };
  document.dispatchEvent(
    new CustomEvent(VAGATO_FIELDS_EVENT, {
      detail: { fieldsCount, mappedFields },
    })
  );
}

/**
 * Esconde o overlay.
 */
export function hideOverlay(): void {
  document.dispatchEvent(new CustomEvent(VAGATO_HIDE_EVENT));
}
