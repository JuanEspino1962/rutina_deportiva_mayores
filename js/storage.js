/* ==========================================================================
   PASO VITAL - MÓDULO DE ALMACENAMIENTO LOCAL Y PERSISTENCIA (localStorage)
   ========================================================================== */

const StorageEngine = (function () {
    'use strict';

    const STORAGE_KEY = 'paso_vital_app_data_v1';

    const DEFAULT_DATA = {
        profile: {
            name: '',
            ageGroup: '60-64',
            fitnessLevel: 'intermediate',
            daysPerWeek: 4,
            sessionDurationMinutes: 30,
            isOnboarded: false
        },
        settings: {
            easyReadingMode: false,
            highContrast: false,
            voiceEnabled: true,
            soundEnabled: true,
            vibrationEnabled: true,
            unitSystem: 'km'
        },
        currentPlan: null,
        workouts: [],
        progress: {
            totalWorkouts: 0,
            totalMinutesWalked: 0,
            totalMinutesJogged: 0,
            weeklyStreak: 0,
            lastWorkoutTimestamp: null
        },
        lastAppVisitTimestamp: new Date().toISOString()
    };

    /**
     * Cargar todos los datos desde LocalStorage con fallback a valores por defecto
     */
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return DEFAULT_DATA;
            const parsed = JSON.parse(raw);
            return {
                profile: { ...DEFAULT_DATA.profile, ...parsed.profile },
                settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
                currentPlan: parsed.currentPlan || null,
                workouts: parsed.workouts || [],
                progress: { ...DEFAULT_DATA.progress, ...parsed.progress },
                lastAppVisitTimestamp: parsed.lastAppVisitTimestamp || new Date().toISOString()
            };
        } catch (e) {
            console.error('Error al leer de localStorage:', e);
            return DEFAULT_DATA;
        }
    }

    /**
     * Guardar el estado global en LocalStorage
     */
    function saveData(data) {
        try {
            data.lastAppVisitTimestamp = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error al guardar en localStorage:', e);
        }
    }

    /**
     * Obtener y guardar perfil
     */
    function getProfile() {
        return loadData().profile;
    }

    function saveProfile(profileData) {
        const data = loadData();
        data.profile = { ...data.profile, ...profileData };
        saveData(data);
    }

    /**
     * Obtener y guardar ajustes de accesibilidad y sonido
     */
    function getSettings() {
        return loadData().settings;
    }

    function saveSettings(settingsData) {
        const data = loadData();
        data.settings = { ...data.settings, ...settingsData };
        saveData(data);
    }

    /**
     * Plan actual
     */
    function getCurrentPlan() {
        return loadData().currentPlan;
    }

    function saveCurrentPlan(plan) {
        const data = loadData();
        data.currentPlan = plan;
        saveData(data);
    }

    /**
     * Registrar un nuevo entrenamiento completado
     */
    function addCompletedWorkout(workoutLog) {
        const data = loadData();
        data.workouts.push(workoutLog);

        // Actualizar estadísticas agregadas
        data.progress.totalWorkouts += 1;
        data.progress.totalMinutesWalked += (workoutLog.walkMinutes || 0);
        data.progress.totalMinutesJogged += (workoutLog.jogMinutes || 0);
        data.progress.lastWorkoutTimestamp = new Date().toISOString();

        // Actualizar semanas completadas en el plan
        if (data.currentPlan) {
            data.currentPlan.completedWorkoutsCount += 1;
            // Cada 'daysPerWeek' entrenamientos avanzamos de semana en el plan
            const daysPerWeek = data.currentPlan.daysPerWeek || 4;
            const calculatedWeek = Math.min(12, Math.floor(data.currentPlan.completedWorkoutsCount / daysPerWeek) + 1);
            data.currentPlan.currentWeek = calculatedWeek;
        }

        saveData(data);
    }

    /**
     * Obtener historial de entrenamientos
     */
    function getWorkouts() {
        return loadData().workouts;
    }

    /**
     * Obtener progreso global
     */
    function getProgress() {
        return loadData().progress;
    }

    /**
     * Detección de inactividad
     */
    function checkInactivity() {
        const data = loadData();
        if (!data.progress.lastWorkoutTimestamp) {
            return { inactiveDays: 0, showNotice: false };
        }

        const lastDate = new Date(data.progress.lastWorkoutTimestamp);
        const now = new Date();
        const diffTime = Math.abs(now - lastDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return {
            inactiveDays: diffDays,
            suggestSuave: diffDays >= 7,
            suggestRecuperacion: diffDays >= 14
        };
    }

    /**
     * Reiniciar todos los datos
     */
    function resetAllData() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Error al borrar localStorage:', e);
        }
    }

    return {
        loadData: loadData,
        saveData: saveData,
        getProfile: getProfile,
        saveProfile: saveProfile,
        getSettings: getSettings,
        saveSettings: saveSettings,
        getCurrentPlan: getCurrentPlan,
        saveCurrentPlan: saveCurrentPlan,
        addCompletedWorkout: addCompletedWorkout,
        getWorkouts: getWorkouts,
        getProgress: getProgress,
        checkInactivity: checkInactivity,
        resetAllData: resetAllData
    };
})();
