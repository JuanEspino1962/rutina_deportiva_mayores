/* ==========================================================================
   PASO VITAL - MÓDULO DE ACCESIBILIDAD, SÍNTESIS DE VOZ Y SONIDOS NATIVOS
   ========================================================================== */

const AccessibilityEngine = (function () {
    'use strict';

    let audioCtx = null;

    /**
     * Inicializar o reanudar AudioContext para Web Audio API
     */
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    /**
     * Reproducir un tono suave (Chime) sin necesidad de archivos MP3 externos
     */
    function playChimeTone() {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            
            // Oscilador 1 (Nota C5 - 523.25 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now);
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.5);

            // Oscilador 2 (Nota E5 - 659.25 Hz) tras 150ms
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, now + 0.15);
            gain2.gain.setValueAtTime(0.2, now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.7);
        } catch (e) {
            console.warn('Error al reproducir audio WebAudio:', e);
        }
    }

    /**
     * Síntesis de voz hablada en español mediante SpeechSynthesis
     */
    function speakText(text) {
        if (!('speechSynthesis' in window)) return;

        try {
            window.speechSynthesis.cancel(); // Cancelar locuciones previas pendientes

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = 0.95; // Ritmo de habla ligeramente pausado y claro
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Intentar asignar una voz nativa en español
            const voices = window.speechSynthesis.getVoices();
            const esVoice = voices.find(v => v.lang.startsWith('es'));
            if (esVoice) {
                utterance.voice = esVoice;
            }

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('Error en SpeechSynthesis:', e);
        }
    }

    /**
     * Cancelar voz activa
     */
    function stopSpeech() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    /**
     * Vibración háptica en dispositivos móviles compatibles
     */
    function triggerVibration(pattern = [200, 100, 200]) {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.warn('Vibración no soportada o bloqueada:', e);
            }
        }
    }

    /**
     * Anunciador ARIA para lectores de pantalla
     */
    function announceToScreenReader(message) {
        let liveRegion = document.getElementById('aria-live-announcer');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-announcer';
            liveRegion.className = 'sr-only';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            liveRegion.style.clip = 'rect(0,0,0,0)';
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion.textContent = message;
        }, 50);
    }

    /**
     * Aplicar configuraciones visuales de accesibilidad (Lectura Fácil y Alto Contraste)
     */
    function applyAccessibilitySettings(settings) {
        if (settings.easyReadingMode) {
            document.body.classList.add('easy-reading-mode');
        } else {
            document.body.classList.remove('easy-reading-mode');
        }

        if (settings.highContrast) {
            document.body.classList.add('high-contrast-mode');
        } else {
            document.body.classList.remove('high-contrast-mode');
        }
    }

    return {
        playChimeTone: playChimeTone,
        speakText: speakText,
        stopSpeech: stopSpeech,
        triggerVibration: triggerVibration,
        announceToScreenReader: announceToScreenReader,
        applyAccessibilitySettings: applyAccessibilitySettings
    };
})();
