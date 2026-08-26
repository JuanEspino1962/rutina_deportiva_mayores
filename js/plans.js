/* ==========================================================================
   PASO VITAL - GENERADOR DE PLANES DE ENTRENAMIENTO PROGRESIVOS (12 SEMANAS)
   Específicamente adaptado para 5 grupos de edad y 3 niveles de condición física.
   ========================================================================== */

const PlansEngine = (function () {
    'use strict';

    /**
     * Definición de nombres y descripciones de las fases
     */
    const PHASE_TYPES = {
        WARMUP: { type: 'warmup', label: 'Calentamiento: Camina suavemente' },
        WALK: { type: 'walk', label: 'Camina a ritmo cómodo' },
        FAST_WALK: { type: 'fastWalk', label: 'Camina a paso rápido' },
        JOG: { type: 'jog', label: 'Trote suave y relajado' },
        RECOVERY: { type: 'recovery', label: 'Recupera caminando despacio' },
        COOLDOWN: { type: 'cooldown', label: 'Vuelta a la calma y respiración' }
    };

    /**
     * Plantillas base para construir las 12 semanas según el grupo de edad y nivel
     */
    function build12WeeksForGroup(ageGroup, level) {
        const weeks = [];
        
        // Multiplicador de intensidad según edad
        let jogAllowed = true;
        let baseWalkRatio = 1.0;
        let maxJogDuration = 180; // 3 min por intervalo max en jóvenes

        if (ageGroup === '65-69') {
            maxJogDuration = 60; // 1 min max de trote
        } else if (ageGroup === '70+') {
            jogAllowed = (level === 'active'); // En 70+ solo si es activo, si no, caminata rápida
            maxJogDuration = 45;
        }

        // Ajuste por nivel inicial
        if (level === 'beginner') baseWalkRatio = 0.8;
        if (level === 'active') baseWalkRatio = 1.2;

        for (let w = 1; w <= 12; w++) {
            const isRecoveryWeek = (w % 4 === 0); // Semanas 4, 8 y 12 son de recuperación/descarga
            
            let durationMinutes = Math.min(60, Math.round((20 + (w * 2.5)) * baseWalkRatio));
            if (isRecoveryWeek) durationMinutes = Math.round(durationMinutes * 0.8);

            const warmupSec = 300; // 5 min
            const cooldownSec = 300; // 5 min
            const activeSec = Math.max(600, (durationMinutes * 60) - warmupSec - cooldownSec);

            // Construir fases específicas para la semana
            let phases = [];
            let softPhases = [];
            let shortPhases = [];

            // Calentamiento inicial
            phases.push({ type: 'warmup', label: 'Calentamiento: camina despacio', duration: warmupSec });
            softPhases.push({ type: 'warmup', label: 'Calentamiento: camina despacio', duration: warmupSec });
            shortPhases.push({ type: 'warmup', label: 'Calentamiento: camina despacio', duration: 180 });

            // Fases principales por intervalos
            if (!jogAllowed || level === 'beginner' || w <= 2) {
                // Fases basadas exclusivamente en Caminata Rápida e Intervalos de Caminata
                const fastWalkTime = Math.min(180, 60 + (w * 10));
                const normalWalkTime = Math.max(180, 300 - (w * 10));

                let remaining = activeSec;
                while (remaining > 0) {
                    const walkDur = Math.min(remaining, normalWalkTime);
                    phases.push({ type: 'walk', label: 'Camina a ritmo cómodo', duration: walkDur });
                    softPhases.push({ type: 'walk', label: 'Camina a ritmo cómodo', duration: walkDur });
                    remaining -= walkDur;

                    if (remaining > 0) {
                        const fastDur = Math.min(remaining, fastWalkTime);
                        phases.push({ type: 'fastWalk', label: 'Camina más rápido', duration: fastDur });
                        softPhases.push({ type: 'walk', label: 'Camina a ritmo cómodo', duration: fastDur });
                        remaining -= fastDur;
                    }
                }
            } else {
                // Fases que incorporan Trote Suave Progresivo
                const jogTime = Math.min(maxJogDuration, 30 + (w * 15));
                const fastWalkTime = 120;
                const walkTime = 240;

                let remaining = activeSec;
                while (remaining > 0) {
                    const wDur = Math.min(remaining, walkTime);
                    phases.push({ type: 'walk', label: 'Camina a ritmo cómodo', duration: wDur });
                    softPhases.push({ type: 'walk', label: 'Camina a ritmo cómodo', duration: wDur });
                    remaining -= wDur;

                    if (remaining > 0) {
                        const jDur = Math.min(remaining, jogTime);
                        phases.push({ type: 'jog', label: 'Trote suave y ligero', duration: jDur });
                        // El plan suave sustituye el trote por caminata rápida
                        softPhases.push({ type: 'fastWalk', label: 'Camina a paso ligero (sin trote)', duration: jDur });
                        remaining -= jDur;
                    }

                    if (remaining > 0) {
                        const rDur = Math.min(remaining, 120);
                        phases.push({ type: 'recovery', label: 'Recupera caminando despacio', duration: rDur });
                        softPhases.push({ type: 'recovery', label: 'Recupera caminando despacio', duration: rDur });
                        remaining -= rDur;
                    }
                }
            }

            // Vuelta a la calma final
            phases.push({ type: 'cooldown', label: 'Vuelta a la calma y respiración', duration: cooldownSec });
            softPhases.push({ type: 'cooldown', label: 'Vuelta a la calma y respiración', duration: cooldownSec });

            // Versión corta (50% duración)
            shortPhases.push({ type: 'walk', label: 'Camina a ritmo relajado', duration: Math.round(activeSec * 0.4) });
            shortPhases.push({ type: 'fastWalk', label: 'Caminata un poco más viva', duration: Math.round(activeSec * 0.2) });
            shortPhases.push({ type: 'cooldown', label: 'Vuelta a la calma', duration: 180 });

            // Calcular desglose de tiempos en minutos para el resumen
            const walkMin = Math.round(phases.filter(p => p.type === 'walk' || p.type === 'warmup' || p.type === 'cooldown' || p.type === 'recovery').reduce((a, b) => a + b.duration, 0) / 60);
            const fastWalkMin = Math.round(phases.filter(p => p.type === 'fastWalk').reduce((a, b) => a + b.duration, 0) / 60);
            const jogMin = Math.round(phases.filter(p => p.type === 'jog').reduce((a, b) => a + b.duration, 0) / 60);

            weeks.push({
                weekNumber: w,
                title: isRecoveryWeek ? `Semana ${w}: Recuperación y asimilación` : `Semana ${w}: Progresión suave`,
                estimatedDuration: durationMinutes,
                isRecoveryWeek: isRecoveryWeek,
                goal: isRecoveryWeek ? 'Consolidar el hábito y permitir descanso articular.' : 'Aumentar la resistencia cardiovascular progresivamente.',
                statsSummary: {
                    walkMin: walkMin,
                    fastWalkMin: fastWalkMin,
                    jogMin: jogMin
                },
                workoutTemplate: {
                    id: `w${w}d1`,
                    week: w,
                    title: `Sesión de la Semana ${w}`,
                    estimatedDuration: durationMinutes,
                    phases: phases,
                    softPhases: softPhases,
                    shortPhases: shortPhases
                }
            });
        }

        return weeks;
    }

    /**
     * Generar un plan completo según el perfil del usuario
     */
    function generatePlanForUser(profile) {
        const ageGroup = profile.ageGroup || '60-64';
        const level = profile.fitnessLevel || 'intermediate';
        const days = parseInt(profile.daysPerWeek, 10) || 4;

        const weeks = build12WeeksForGroup(ageGroup, level);

        return {
            id: `plan_${ageGroup}_${level}_${days}d`,
            createdAt: new Date().toISOString(),
            ageGroup: ageGroup,
            fitnessLevel: level,
            daysPerWeek: days,
            currentWeek: 1,
            completedWorkoutsCount: 0,
            useSoftPlan: (ageGroup === '70+' && level === 'beginner'),
            weeks: weeks
        };
    }

    return {
        generatePlanForUser: generatePlanForUser,
        build12WeeksForGroup: build12WeeksForGroup
    };
})();
