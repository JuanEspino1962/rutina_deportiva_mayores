/* ==========================================================================
   PASO VITAL - CONTROLADOR PRINCIPAL Y LÓGICA DE NAVEGACIÓN (SPA)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // Estado local de la aplicación
    let activeView = 'home';
    let onboardingData = {
        ageGroup: '60-64',
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
        sessionDurationMinutes: 30
    };
    let currentSelectedEffort = null;
    let currentSelectedMood = null;
    let pendingWorkoutMode = 'normal';

    // --------------------------------------------------------------------------
    // 1. INICIALIZACIÓN DE LA APLICACIÓN
    // --------------------------------------------------------------------------
    function initApp() {
        const profile = StorageEngine.getProfile();
        const settings = StorageEngine.getSettings();

        // Aplicar configuraciones de accesibilidad
        AccessibilityEngine.applyAccessibilitySettings(settings);
        updateSettingsFormValues(profile, settings);

        // Verificar si el usuario ha completado la configuración inicial
        if (!profile.isOnboarded) {
            showView('onboarding');
        } else {
            // Asegurar que exista un plan activo
            let plan = StorageEngine.getCurrentPlan();
            if (!plan) {
                plan = PlansEngine.generatePlanForUser(profile);
                StorageEngine.saveCurrentPlan(plan);
            }
            showView('home');
        }

        bindEvents();
    }

    // --------------------------------------------------------------------------
    // 2. ENRUTADOR Y CONTROL DE VISTAS (SPA)
    // --------------------------------------------------------------------------
    function showView(viewId) {
        activeView = viewId;

        // Ocultar todas las secciones
        const sections = document.querySelectorAll('.view-section');
        sections.forEach(sec => sec.classList.add('hidden'));

        // Mostrar sección objetivo
        const targetSec = document.getElementById(`view-${viewId}`);
        if (targetSec) {
            targetSec.classList.remove('hidden');
        }

        // Actualizar barra de navegación inferior
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Ocultar barra de navegación durante el entrenamiento activo o en el asistente inicial
        const bottomNav = document.querySelector('.bottom-nav');
        if (viewId === 'workout' || viewId === 'onboarding') {
            bottomNav.classList.add('hidden');
        } else {
            bottomNav.classList.remove('hidden');
        }

        // Renderizar vista específica según destino
        if (viewId === 'home') renderHomeView();
        if (viewId === 'plan') renderPlanView();
        if (viewId === 'calendar') renderCalendarView();
        if (viewId === 'progress') renderProgressView();

        window.scrollTo(0, 0);
    }

    // --------------------------------------------------------------------------
    // 3. ASISTENTE DE CONFIGURACIÓN INICIAL (ONBOARDING)
    // --------------------------------------------------------------------------
    function handleOnboardingChoice(step, value) {
        if (step === 1) {
            onboardingData.ageGroup = value;
            document.getElementById('onboarding-step-1').classList.add('hidden');
            document.getElementById('onboarding-step-2').classList.remove('hidden');
            document.getElementById('onboarding-step-num').textContent = '2';
        } else if (step === 2) {
            onboardingData.fitnessLevel = value;
            document.getElementById('onboarding-step-2').classList.add('hidden');
            document.getElementById('onboarding-step-3').classList.remove('hidden');
            document.getElementById('onboarding-step-num').textContent = '3';
        } else if (step === 3) {
            onboardingData.daysPerWeek = parseInt(value, 10);
            document.getElementById('onboarding-step-3').classList.add('hidden');
            document.getElementById('onboarding-step-4').classList.remove('hidden');
            document.getElementById('onboarding-step-num').textContent = '4';
        } else if (step === 4) {
            onboardingData.sessionDurationMinutes = parseInt(value, 10);
            
            // Finalizar onboarding y guardar perfil
            const profile = {
                ...StorageEngine.getProfile(),
                ...onboardingData,
                isOnboarded: true
            };
            StorageEngine.saveProfile(profile);

            // Generar primer plan de 12 semanas
            const plan = PlansEngine.generatePlanForUser(profile);
            StorageEngine.saveCurrentPlan(plan);

            showView('home');
        }
    }

    // --------------------------------------------------------------------------
    // 4. RENDERIZADO DE LA PANTALLA PRINCIPAL (HOY)
    // --------------------------------------------------------------------------
    function renderHomeView() {
        const profile = StorageEngine.getProfile();
        const plan = StorageEngine.getCurrentPlan() || PlansEngine.generatePlanForUser(profile);
        
        // Saludo según la hora
        const hour = new Date().getHours();
        let greeting = '¡Buenos días!';
        if (hour >= 12 && hour < 20) greeting = '¡Buenas tardes!';
        if (hour >= 20 || hour < 6) greeting = '¡Buenas noches!';
        
        document.getElementById('home-greeting').textContent = greeting;

        // Banner de inactividad
        const inactivity = StorageEngine.checkInactivity();
        const adaptBanner = document.getElementById('home-adapt-banner');
        const adaptText = document.getElementById('home-adapt-text');
        
        if (inactivity.suggestRecuperacion) {
            adaptBanner.classList.remove('hidden');
            adaptText.textContent = `Hace ${inactivity.inactiveDays} días que no entrenamos. Hemos preparado una sesión suave para retomar con tranquilidad.`;
            pendingWorkoutMode = 'soft';
        } else if (inactivity.suggestSuave) {
            adaptBanner.classList.remove('hidden');
            adaptText.textContent = `Retomamos la actividad con un paseo progresivo y cómodo.`;
            pendingWorkoutMode = 'soft';
        } else {
            adaptBanner.classList.add('hidden');
            pendingWorkoutMode = 'normal';
        }

        // Obtener datos de la semana actual del plan
        const currentWeekNum = Math.min(12, plan.currentWeek || 1);
        const weekData = plan.weeks.find(w => w.weekNumber === currentWeekNum) || plan.weeks[0];
        const template = weekData.workoutTemplate;

        document.getElementById('today-workout-title').textContent = `${weekData.title}`;
        document.getElementById('today-workout-duration').textContent = weekData.estimatedDuration;

        // Renderizar lista de fases en la tarjeta de hoy
        const phasesListEl = document.getElementById('today-workout-phases-list');
        phasesListEl.innerHTML = '';

        const phasesToDisplay = (pendingWorkoutMode === 'soft' && template.softPhases) ? template.softPhases : template.phases;

        phasesToDisplay.forEach(p => {
            const li = document.createElement('li');
            const durationMin = Math.max(1, Math.round(p.duration / 60));
            li.innerHTML = `<span>${p.label}</span> <strong>${durationMin} min</strong>`;
            phasesListEl.appendChild(li);
        });
    }

    // --------------------------------------------------------------------------
    // 5. EJECUCIÓN Y CONTROL DEL ENTRENAMIENTO ACTIVO
    // --------------------------------------------------------------------------
    function startTodayWorkout(mode = 'normal') {
        const profile = StorageEngine.getProfile();
        const settings = StorageEngine.getSettings();
        const plan = StorageEngine.getCurrentPlan() || PlansEngine.generatePlanForUser(profile);
        
        const currentWeekNum = Math.min(12, plan.currentWeek || 1);
        const weekData = plan.weeks.find(w => w.weekNumber === currentWeekNum) || plan.weeks[0];
        const template = weekData.workoutTemplate;

        showView('workout');

        // Configurar callbacks del motor de entrenamiento
        const callbacks = {
            onTick: function (data) {
                document.getElementById('active-timer-display').textContent = data.displayTime;
                document.getElementById('active-phase-title').textContent = data.phaseName;
                document.getElementById('active-next-phase-text').textContent = data.nextPhaseName;
            },
            onPhaseChange: function (phase) {
                document.getElementById('active-phase-title').textContent = phase.label;
            },
            onComplete: function (results) {
                showView('rating');
            },
            onEmergency: function () {
                document.getElementById('modal-emergency').classList.remove('hidden');
            }
        };

        WorkoutEngine.startWorkout(template, settings, callbacks, mode);
    }

    function startFreeWalkSession() {
        const settings = StorageEngine.getSettings();
        showView('workout');

        const callbacks = {
            onTick: function (data) {
                document.getElementById('active-timer-display').textContent = data.displayTime;
                document.getElementById('active-phase-title').textContent = data.phaseName;
                document.getElementById('active-next-phase-text').textContent = data.nextPhaseName;
            },
            onComplete: function () {
                showView('rating');
            },
            onEmergency: function () {
                document.getElementById('modal-emergency').classList.remove('hidden');
            }
        };

        WorkoutEngine.startFreeWalk(settings, callbacks);
    }

    // --------------------------------------------------------------------------
    // 6. RENDERIZADO DE PLAN DE 12 SEMANAS
    // --------------------------------------------------------------------------
    function renderPlanView() {
        const profile = StorageEngine.getProfile();
        const plan = StorageEngine.getCurrentPlan() || PlansEngine.generatePlanForUser(profile);

        document.getElementById('plan-user-group-desc').textContent = 
            `Plan adaptado para grupo ${plan.ageGroup} (${plan.daysPerWeek} días/semana).`;

        const container = document.getElementById('plan-weeks-accordion');
        container.innerHTML = '';

        plan.weeks.forEach(w => {
            const isCurrent = (w.weekNumber === plan.currentWeek);
            const card = document.createElement('div');
            card.className = `week-card ${isCurrent ? 'current-week' : ''}`;
            
            card.innerHTML = `
                <div class="week-card-header">
                    <span class="week-number">Semana ${w.weekNumber}</span>
                    ${isCurrent ? '<span class="week-badge">SEMANA ACTUAL</span>' : ''}
                    ${w.isRecoveryWeek ? '<span class="week-badge">RECUPERACIÓN</span>' : ''}
                </div>
                <div class="week-goal">${w.goal}</div>
                <div class="week-details-grid">
                    <div>⏱️ <strong>Duración:</strong> ${w.estimatedDuration} min</div>
                    <div>🚶 <strong>Caminata:</strong> ${w.statsSummary.walkMin} min</div>
                    <div>⚡ <strong>Caminata rápida:</strong> ${w.statsSummary.fastWalkMin} min</div>
                    <div>🏃 <strong>Trote suave:</strong> ${w.statsSummary.jogMin} min</div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --------------------------------------------------------------------------
    // 7. RENDERIZADO DE CALENDARIO SEMANAL
    // --------------------------------------------------------------------------
    function renderCalendarView() {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const todayIdx = (new Date().getDay() + 6) % 7; // Convertir Domingo (0) a índice 6
        const container = document.getElementById('calendar-days-container');
        container.innerHTML = '';

        const workouts = StorageEngine.getWorkouts();
        const profile = StorageEngine.getProfile();
        const daysPerWeek = profile.daysPerWeek || 4;

        days.forEach((dayName, idx) => {
            const isToday = (idx === todayIdx);
            const isWorkoutDay = (idx < daysPerWeek);

            let statusMarkup = '<span class="status-badge status-rest">— Descanso</span>';
            let infoText = 'Recomendación: paseo ligero o estiramientos suaves.';

            if (isWorkoutDay) {
                if (idx < todayIdx) {
                    statusMarkup = '<span class="status-badge status-done">✓ Completado</span>';
                    infoText = 'Sesión realizada con éxito.';
                } else if (isToday) {
                    statusMarkup = '<span class="status-badge status-today">● Hoy</span>';
                    infoText = 'Entrenamiento programado para hoy.';
                } else {
                    statusMarkup = '<span class="status-badge status-pending">○ Pendiente</span>';
                    infoText = 'Entrenamiento previsto.';
                }
            }

            const row = document.createElement('div');
            row.className = `day-row ${isToday ? 'is-today' : ''}`;
            row.innerHTML = `
                <div class="day-name-box">
                    <span class="day-name">${dayName}</span>
                    <span class="day-workout-info">${infoText}</span>
                </div>
                <div>${statusMarkup}</div>
            `;
            container.appendChild(row);
        });
    }

    // --------------------------------------------------------------------------
    // 8. RENDERIZADO DE PROGRESO Y LOGROS
    // --------------------------------------------------------------------------
    function renderProgressView() {
        const progress = StorageEngine.getProgress();
        const plan = StorageEngine.getCurrentPlan();

        document.getElementById('stat-workouts-count').textContent = progress.totalWorkouts || 0;
        document.getElementById('stat-minutes-walked').textContent = progress.totalMinutesWalked || 0;
        document.getElementById('stat-minutes-jogged').textContent = progress.totalMinutesJogged || 0;
        document.getElementById('stat-streak-days').textContent = progress.weeklyStreak || 0;

        // Barra de progreso semanal
        const daysPerWeek = (plan && plan.daysPerWeek) ? plan.daysPerWeek : 4;
        const currentCountInWeek = (plan && plan.completedWorkoutsCount) ? (plan.completedWorkoutsCount % daysPerWeek) : 0;
        const pct = Math.min(100, Math.round((currentCountInWeek / daysPerWeek) * 100));

        document.getElementById('weekly-progress-fill').style.width = `${pct}%`;
        document.getElementById('weekly-progress-text').textContent = `${currentCountInWeek} de ${daysPerWeek} entrenamientos (${pct}%)`;

        // Renderizar medallas de logros
        const badgesContainer = document.getElementById('badges-container');
        badgesContainer.innerHTML = '';

        const badges = [
            { id: 'b1', icon: '🌱', name: 'Primer paso', desc: 'Completa tu primer entrenamiento', unlocked: progress.totalWorkouts >= 1 },
            { id: 'b2', icon: '🏆', name: 'Constancia', desc: 'Completa 5 entrenamientos', unlocked: progress.totalWorkouts >= 5 },
            { id: 'b3', icon: '🚀', name: 'En marcha', desc: 'Completa 10 entrenamientos', unlocked: progress.totalWorkouts >= 10 },
            { id: 'b4', icon: '⏱️', name: '10 Horas', desc: 'Acumula 600 min activos', unlocked: (progress.totalMinutesWalked + progress.totalMinutesJogged) >= 600 }
        ];

        badges.forEach(b => {
            const badgeEl = document.createElement('div');
            badgeEl.className = `badge-item ${b.unlocked ? 'unlocked' : ''}`;
            badgeEl.innerHTML = `
                <span class="badge-icon" aria-hidden="true">${b.icon}</span>
                <span class="badge-name">${b.name}</span>
                <span class="badge-desc">${b.desc}</span>
            `;
            badgesContainer.appendChild(badgeEl);
        });
    }

    // --------------------------------------------------------------------------
    // 9. CONFIGURACIÓN Y AJUSTES FORMULARIO
    // --------------------------------------------------------------------------
    function updateSettingsFormValues(profile, settings) {
        document.getElementById('set-age-group').value = profile.ageGroup || '60-64';
        document.getElementById('set-fitness-level').value = profile.fitnessLevel || 'intermediate';
        document.getElementById('set-days-per-week').value = profile.daysPerWeek || 4;

        document.getElementById('set-easy-mode').checked = !!settings.easyReadingMode;
        document.getElementById('set-high-contrast').checked = !!settings.highContrast;
        document.getElementById('set-voice-enabled').checked = !!settings.voiceEnabled;
        document.getElementById('set-sound-enabled').checked = !!settings.soundEnabled;
        document.getElementById('set-vibration-enabled').checked = !!settings.vibrationEnabled;
    }

    // --------------------------------------------------------------------------
    // 10. GESTIÓN DE EVENTOS Y VINCULACIONES
    // --------------------------------------------------------------------------
    function bindEvents() {
        // Navegación principal inferior
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.addEventListener('click', function () {
                const targetView = this.getAttribute('data-view');
                showView(targetView);
            });
        });

        // Botón superior Lectura Fácil
        document.getElementById('btn-toggle-easy-mode').addEventListener('click', function () {
            const settings = StorageEngine.getSettings();
            settings.easyReadingMode = !settings.easyReadingMode;
            StorageEngine.saveSettings(settings);
            AccessibilityEngine.applyAccessibilitySettings(settings);
            this.setAttribute('aria-pressed', settings.easyReadingMode);
        });

        // Onboarding opción elegida
        document.querySelectorAll('#view-onboarding button[data-age]').forEach(btn => {
            btn.addEventListener('click', () => handleOnboardingChoice(1, btn.getAttribute('data-age')));
        });
        document.querySelectorAll('#view-onboarding button[data-level]').forEach(btn => {
            btn.addEventListener('click', () => handleOnboardingChoice(2, btn.getAttribute('data-level')));
        });
        document.querySelectorAll('#view-onboarding button[data-days]').forEach(btn => {
            btn.addEventListener('click', () => handleOnboardingChoice(3, btn.getAttribute('data-days')));
        });
        document.querySelectorAll('#view-onboarding button[data-time]').forEach(btn => {
            btn.addEventListener('click', () => handleOnboardingChoice(4, btn.getAttribute('data-time')));
        });

        // Botones pantalla inicio
        document.getElementById('btn-start-workout').addEventListener('click', () => startTodayWorkout(pendingWorkoutMode));
        document.getElementById('btn-free-walk').addEventListener('click', startFreeWalkSession);
        document.getElementById('btn-today-cant').addEventListener('click', () => {
            document.getElementById('modal-cant-today').classList.remove('hidden');
        });

        // Modal "Hoy no puedo"
        document.getElementById('btn-close-cant-modal').addEventListener('click', () => {
            document.getElementById('modal-cant-today').classList.add('hidden');
        });
        document.getElementById('btn-opt-short-version').addEventListener('click', () => {
            document.getElementById('modal-cant-today').classList.add('hidden');
            startTodayWorkout('short');
        });
        document.getElementById('btn-opt-gentle-walk').addEventListener('click', () => {
            document.getElementById('modal-cant-today').classList.add('hidden');
            startTodayWorkout('soft');
        });
        document.getElementById('btn-opt-postpone').addEventListener('click', () => {
            document.getElementById('modal-cant-today').classList.add('hidden');
            alert('Sesión pospuesta para mañana. ¡Descansa hoy!');
        });
        document.getElementById('btn-opt-rest').addEventListener('click', () => {
            document.getElementById('modal-cant-today').classList.add('hidden');
            alert('Día de descanso registrado. ¡Cuídate!');
        });

        // Controles de entrenamiento activo
        document.getElementById('btn-pause-workout').addEventListener('click', function () {
            const settings = StorageEngine.getSettings();
            WorkoutEngine.pause(settings);
            this.classList.add('hidden');
            document.getElementById('btn-resume-workout').classList.remove('hidden');
        });

        document.getElementById('btn-resume-workout').addEventListener('click', function () {
            const settings = StorageEngine.getSettings();
            WorkoutEngine.resume(settings);
            this.classList.add('hidden');
            document.getElementById('btn-pause-workout').classList.remove('hidden');
        });

        document.getElementById('btn-stop-workout').addEventListener('click', function () {
            WorkoutEngine.stop();
            showView('home');
        });

        document.getElementById('btn-emergency').addEventListener('click', function () {
            WorkoutEngine.triggerEmergency();
        });

        document.getElementById('btn-close-emergency').addEventListener('click', function () {
            document.getElementById('modal-emergency').classList.add('hidden');
            WorkoutEngine.stop();
            showView('home');
        });

        // Valoración Post-Entrenamiento
        document.querySelectorAll('.btn-effort').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.btn-effort').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                currentSelectedEffort = parseInt(this.getAttribute('data-effort'), 10);
                checkCanSaveRating();
            });
        });

        document.querySelectorAll('.btn-mood').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.btn-mood').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                currentSelectedMood = this.getAttribute('data-mood');
                checkCanSaveRating();
            });
        });

        function checkCanSaveRating() {
            const saveBtn = document.getElementById('btn-save-rating');
            if (currentSelectedEffort && currentSelectedMood) {
                saveBtn.removeAttribute('disabled');
            }
        }

        document.getElementById('btn-save-rating').addEventListener('click', function () {
            const workoutState = WorkoutEngine.getState();
            const elapsedMin = Math.max(1, Math.round(workoutState.totalElapsedSeconds / 60));

            // Guardar registro
            StorageEngine.addCompletedWorkout({
                date: new Date().toISOString(),
                durationMinutes: elapsedMin,
                walkMinutes: elapsedMin,
                jogMinutes: 0,
                effortRating: currentSelectedEffort,
                moodRating: currentSelectedMood
            });

            // Reiniciar selección
            currentSelectedEffort = null;
            currentSelectedMood = null;
            this.setAttribute('disabled', 'true');

            showView('home');
        });

        // Aviso de seguridad y salud
        document.getElementById('btn-open-safety-notice').addEventListener('click', () => showView('safety'));
        document.getElementById('btn-back-from-safety').addEventListener('click', () => showView('home'));

        // Formulario de Ajustes
        document.getElementById('form-settings').addEventListener('submit', function (e) {
            e.preventDefault();

            const profile = StorageEngine.getProfile();
            const settings = StorageEngine.getSettings();

            profile.ageGroup = document.getElementById('set-age-group').value;
            profile.fitnessLevel = document.getElementById('set-fitness-level').value;
            profile.daysPerWeek = parseInt(document.getElementById('set-days-per-week').value, 10);

            settings.easyReadingMode = document.getElementById('set-easy-mode').checked;
            settings.highContrast = document.getElementById('set-high-contrast').checked;
            settings.voiceEnabled = document.getElementById('set-voice-enabled').checked;
            settings.soundEnabled = document.getElementById('set-sound-enabled').checked;
            settings.vibrationEnabled = document.getElementById('set-vibration-enabled').checked;

            StorageEngine.saveProfile(profile);
            StorageEngine.saveSettings(settings);
            AccessibilityEngine.applyAccessibilitySettings(settings);

            // Re-generar plan si cambió el grupo de edad o nivel
            const newPlan = PlansEngine.generatePlanForUser(profile);
            StorageEngine.saveCurrentPlan(newPlan);

            alert('Ajustes guardados correctamente.');
            showView('home');
        });

        // Reiniciar datos
        document.getElementById('btn-reset-data').addEventListener('click', () => {
            document.getElementById('modal-confirm-reset').classList.remove('hidden');
        });
        document.getElementById('btn-confirm-reset-no').addEventListener('click', () => {
            document.getElementById('modal-confirm-reset').classList.add('hidden');
        });
        document.getElementById('btn-confirm-reset-yes').addEventListener('click', () => {
            StorageEngine.resetAllData();
            document.getElementById('modal-confirm-reset').classList.add('hidden');
            location.reload();
        });
    }

    // Iniciar app al cargar la página
    initApp();
});
