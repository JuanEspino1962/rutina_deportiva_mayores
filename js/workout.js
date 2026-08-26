/* ==========================================================================
   PASO VITAL - MOTOR DE ENTRENAMIENTO EN TIEMPO REAL Y CRONÓMETRO
   ========================================================================== */

const WorkoutEngine = (function () {
    'use strict';

    let state = {
        isRunning: false,
        isPaused: false,
        isFreeWalk: false,
        currentWorkout: null,
        currentPhaseIndex: 0,
        timeRemainingInPhase: 0,
        totalElapsedSeconds: 0,
        timerInterval: null,
        callbacks: {
            onTick: null,
            onPhaseChange: null,
            onComplete: null,
            onEmergency: null
        }
    };

    /**
     * Formatear segundos en formato accesible MM:SS
     */
    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const padMins = mins < 10 ? '0' + mins : mins;
        const padSecs = secs < 10 ? '0' + secs : secs;
        return `${padMins}:${padSecs}`;
    }

    /**
     * Iniciar un entrenamiento estructurado
     */
    function startWorkout(workoutTemplate, settings, callbacks, mode = 'normal') {
        stop(); // Limpieza de temporizadores anteriores

        let phasesToUse = workoutTemplate.phases;
        if (mode === 'soft' && workoutTemplate.softPhases) {
            phasesToUse = workoutTemplate.softPhases;
        } else if (mode === 'short' && workoutTemplate.shortPhases) {
            phasesToUse = workoutTemplate.shortPhases;
        }

        state.isRunning = true;
        state.isPaused = false;
        state.isFreeWalk = false;
        state.currentWorkout = {
            id: workoutTemplate.id,
            week: workoutTemplate.week,
            title: workoutTemplate.title,
            phases: phasesToUse
        };
        state.currentPhaseIndex = 0;
        state.timeRemainingInPhase = phasesToUse[0].duration;
        state.totalElapsedSeconds = 0;
        state.callbacks = callbacks || {};

        // Iniciar intervalo de 1 segundo
        state.timerInterval = setInterval(() => tick(settings), 1000);

        // Notificar inicio de fase inicial
        notifyPhaseChange(settings);

        if (settings.voiceEnabled) {
            AccessibilityEngine.speakText(`Empezamos tu entrenamiento. Fase actual: ${phasesToUse[0].label}`);
        }
    }

    /**
     * Iniciar un paseo libre ("Salir a caminar")
     */
    function startFreeWalk(settings, callbacks) {
        stop();

        state.isRunning = true;
        state.isPaused = false;
        state.isFreeWalk = true;
        state.currentWorkout = {
            id: 'free_walk_' + Date.now(),
            title: 'Paseo Libre',
            phases: [{ type: 'walk', label: 'Paseo libre a tu propio ritmo', duration: 0 }]
        };
        state.currentPhaseIndex = 0;
        state.timeRemainingInPhase = 0; // En paseo libre cuenta hacia arriba
        state.totalElapsedSeconds = 0;
        state.callbacks = callbacks || {};

        state.timerInterval = setInterval(() => {
            if (!state.isPaused) {
                state.totalElapsedSeconds += 1;
                if (state.callbacks.onTick) {
                    state.callbacks.onTick({
                        displayTime: formatTime(state.totalElapsedSeconds),
                        phaseName: 'Paseo Libre',
                        nextPhaseName: 'Presiona Finalizar cuando quieras terminar'
                    });
                }
            }
        }, 1000);

        if (settings.voiceEnabled) {
            AccessibilityEngine.speakText('Paseo libre iniciado. Camina a tu propio ritmo sin prisas.');
        }
    }

    /**
     * Ciclo de temporizador (cada 1 segundo)
     */
    function tick(settings) {
        if (state.isPaused) return;

        state.totalElapsedSeconds += 1;
        state.timeRemainingInPhase -= 1;

        const phases = state.currentWorkout.phases;
        const currentPhase = phases[state.currentPhaseIndex];
        const nextPhase = phases[state.currentPhaseIndex + 1];

        // Actualizar UI
        if (state.callbacks.onTick) {
            state.callbacks.onTick({
                displayTime: formatTime(state.timeRemainingInPhase),
                phaseName: currentPhase.label,
                nextPhaseName: nextPhase ? `${nextPhase.label} (${Math.round(nextPhase.duration / 60)} min)` : 'Finalización del entrenamiento'
            });
        }

        // Si la fase ha concluido
        if (state.timeRemainingInPhase <= 0) {
            if (state.currentPhaseIndex < phases.length - 1) {
                state.currentPhaseIndex += 1;
                state.timeRemainingInPhase = phases[state.currentPhaseIndex].duration;

                // Notificar cambio de fase
                notifyPhaseChange(settings);
            } else {
                // Entrenamiento finalizado por completo
                completeWorkout(settings);
            }
        }
    }

    /**
     * Notificación de cambio de fase con audio, voz y vibración
     */
    function notifyPhaseChange(settings) {
        const currentPhase = state.currentWorkout.phases[state.currentPhaseIndex];
        
        if (settings.soundEnabled) {
            AccessibilityEngine.playChimeTone();
        }

        if (settings.vibrationEnabled) {
            AccessibilityEngine.triggerVibration([200, 100, 200]);
        }

        if (settings.voiceEnabled) {
            AccessibilityEngine.speakText(`Nueva fase: ${currentPhase.label}`);
        }

        AccessibilityEngine.announceToScreenReader(`Cambio de fase: ${currentPhase.label}`);

        if (state.callbacks.onPhaseChange) {
            state.callbacks.onPhaseChange(currentPhase, state.currentPhaseIndex);
        }
    }

    /**
     * Pausar el entrenamiento
     */
    function pause(settings) {
        if (!state.isRunning || state.isPaused) return;
        state.isPaused = true;
        if (settings && settings.voiceEnabled) {
            AccessibilityEngine.speakText('Entrenamiento pausado.');
        }
    }

    /**
     * Reanudar el entrenamiento
     */
    function resume(settings) {
        if (!state.isRunning || !state.isPaused) return;
        state.isPaused = false;
        if (settings && settings.voiceEnabled) {
            AccessibilityEngine.speakText('Reanudando entrenamiento.');
        }
    }

    /**
     * Activar parada de emergencia médica ("NO ME ENCUENTRO BIEN")
     */
    function triggerEmergency() {
        pause();
        AccessibilityEngine.stopSpeech();
        if (state.callbacks.onEmergency) {
            state.callbacks.onEmergency();
        }
    }

    /**
     * Completar el entrenamiento con éxito
     */
    function completeWorkout(settings) {
        stop();

        if (settings.soundEnabled) {
            AccessibilityEngine.playChimeTone();
        }

        if (settings.voiceEnabled) {
            AccessibilityEngine.speakText('¡Excelente trabajo! Has completado con éxito tu entrenamiento de hoy.');
        }

        if (state.callbacks.onComplete) {
            state.callbacks.onComplete({
                workoutId: state.currentWorkout.id,
                totalElapsedSeconds: state.totalElapsedSeconds,
                phases: state.currentWorkout.phases
            });
        }
    }

    /**
     * Detener y limpiar temporizadores
     */
    function stop() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        state.isRunning = false;
        state.isPaused = false;
        AccessibilityEngine.stopSpeech();
    }

    function getState() {
        return { ...state };
    }

    return {
        startWorkout: startWorkout,
        startFreeWalk: startFreeWalk,
        pause: pause,
        resume: resume,
        stop: stop,
        triggerEmergency: triggerEmergency,
        getState: getState,
        formatTime: formatTime
    };
})();
