import { useEffect, useRef } from 'react';

const SEQUENCE = ['v', 'a', 'g', 'a', 't', 'o'];
const TIMEOUT_MS = 2000; // reset se demorar mais de 2s entre teclas

/**
 * Sintetiza um miado de gato realista e fofo usando Web Audio API.
 * Simula formantes vocais de um gato: "mi-AAU" com vibrato e nasalidade.
 */
function playCatMeow() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    const dur = 0.65;

    // ── Master gain ──────────────────────────────────────────────────
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.35, t);
    master.connect(ctx.destination);

    // ── Formant filter (simula ressonância nasal do gato) ────────────
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(800, t);
    formant.frequency.linearRampToValueAtTime(1400, t + 0.15);
    formant.frequency.linearRampToValueAtTime(1100, t + 0.35);
    formant.frequency.linearRampToValueAtTime(700, t + dur);
    formant.Q.setValueAtTime(5, t);
    formant.connect(master);

    // ── Segundo formant (harmônico superior — "brilho" do miado) ─────
    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(2200, t);
    formant2.frequency.linearRampToValueAtTime(3200, t + 0.15);
    formant2.frequency.linearRampToValueAtTime(2600, t + 0.35);
    formant2.frequency.linearRampToValueAtTime(1800, t + dur);
    formant2.Q.setValueAtTime(8, t);

    const formant2Gain = ctx.createGain();
    formant2Gain.gain.setValueAtTime(0.15, t);
    formant2.connect(formant2Gain).connect(master);

    // ── Oscilador fundamental (tom vocal do gato) ────────────────────
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; // rico em harmônicos como voz de gato
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.linearRampToValueAtTime(680, t + 0.12);   // "mi-"
    osc.frequency.linearRampToValueAtTime(780, t + 0.22);   // "-AA"
    osc.frequency.setValueAtTime(780, t + 0.32);             // sustain
    osc.frequency.linearRampToValueAtTime(600, t + 0.48);   // "-au"
    osc.frequency.linearRampToValueAtTime(420, t + dur);     // fade

    // ── Vibrato (LFO modulando pitch — tremor natural da voz) ────────
    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(6, t); // 6Hz tremor
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.setValueAtTime(0, t);
    vibratoGain.gain.linearRampToValueAtTime(12, t + 0.2); // aumenta com sustain
    vibratoGain.gain.linearRampToValueAtTime(18, t + 0.4);
    vibratoGain.gain.linearRampToValueAtTime(0, t + dur);
    vibrato.connect(vibratoGain).connect(osc.frequency);

    // ── Envelope de amplitude (ataque + sustain + decay suave) ────────
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.7, t + 0.04);   // ataque rápido
    env.gain.linearRampToValueAtTime(0.9, t + 0.15);   // crescendo
    env.gain.setValueAtTime(0.9, t + 0.30);             // sustain
    env.gain.linearRampToValueAtTime(0.5, t + 0.45);   // decay
    env.gain.exponentialRampToValueAtTime(0.01, t + dur);

    // ── Noise burst (ataque "ff" inicial — sopro nasal) ──────────────
    const noiseLen = ctx.sampleRate * 0.06;
    const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.3;

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.linearRampToValueAtTime(0, t + 0.06);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3000, t);
    noiseFilter.Q.setValueAtTime(2, t);
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(master);

    // ── Conectar e tocar ─────────────────────────────────────────────
    osc.connect(env);
    env.connect(formant);
    env.connect(formant2);

    osc.start(t);
    vibrato.start(t);
    noiseSrc.start(t);
    osc.stop(t + dur + 0.05);
    vibrato.stop(t + dur + 0.05);

    setTimeout(() => ctx.close(), (dur + 0.2) * 1000);
  } catch (e) {
    // Silently fail — é só um Easter Egg
  }
}

/**
 * Hook global: detecta a sequência V-A-G-A-T-O digitada em qualquer lugar.
 * Ao completar, toca um miado de gato fofo.
 */
export default function useVagatoEasterEgg() {
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      // Ignorar se o usuário está em input/textarea/contenteditable
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      const key = e.key.toLowerCase();

      // Reset timer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { indexRef.current = 0; }, TIMEOUT_MS);

      // Verificar próxima tecla da sequência
      if (key === SEQUENCE[indexRef.current]) {
        indexRef.current += 1;

        // Sequência completa!
        if (indexRef.current === SEQUENCE.length) {
          indexRef.current = 0;
          clearTimeout(timerRef.current);
          playCatMeow();
        }
      } else {
        // Tecla errada — resetar (mas verificar se é o início de nova sequência)
        indexRef.current = key === SEQUENCE[0] ? 1 : 0;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
