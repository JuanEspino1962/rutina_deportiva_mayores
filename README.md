# Paso Vital - Actividad Física Adaptada para Mayores de 50 Años

**Paso Vital** es una aplicación web (Progressive Web App - PWA) diseñada para adultos mayores de 50 años enfocada en mejorar progresivamente su condición física mediante rutinas sencillas, intuitivas y adaptativas de caminata, caminata rápida y trote suave.

---

## 🌟 Principales Características

- **Accesibilidad Máxima (WCAG 2.1 AA):** Tipografía de gran tamaño (mínimo 18px base / 22px+ en lectura fácil), alto contraste, áreas táctiles amplias (>= 52px) e indicador de foco accesible para teclado.
- **Asistente Inicial Sencillo:** Cuestionario de 4 preguntas rápidas para asignar el plan ideal según grupo de edad (49–54, 55–59, 60–64, 65–69 y 70+) y nivel físico inicial.
- **Planes Progresivos de 12 Semanas:** Estructura suave por intervalos con semanas de descarga/recuperación cada 4 semanas y opción de **Plan Suave** (exclusivo caminata).
- **Asistencia por Voz y Audio Nativo:** Lectura en español mediante `SpeechSynthesis` y tonos sonoros sintetizados mediante `Web Audio API` sin necesidad de descargar archivos multimedia externos.
- **Botón de Emergencia Médica:** Alerta prominente `"⚠️ NO ME ENCUENTRO BIEN"` con detención inmediata del ejercicio y pautas médicas preventivas.
- **Motor de Adaptación Dinámica:** Ajuste inteligente de la intensidad según las valoraciones de esfuerzo percibido (Escala Borg / Prueba del habla) y detección de inactividad de más de 7 o 14 días.
- **Funcionamiento 100% Offline (PWA):** Instalable en el móvil y completamente funcional sin conexión a internet mediante Service Worker.

---

## 📁 Arquitectura del Proyecto

```text
rutina_deportiva_mayores/
│
├── index.html                 # Estructura semántica HTML5 con todas las pantallas y modales
├── css/
│   ├── styles.css             # Sistema de diseño, tokens CSS, componentes UI, tipografía accesible
│   └── responsive.css         # Layouts responsive (320px+), bottom navigation bar, grid/flex
├── js/
│   ├── plans.js               # Generación y definición de los planes de 12 semanas por edad y nivel
│   ├── storage.js             # Gestión de LocalStorage, perfiles, historial y persistencia
│   ├── accessibility.js       # Modo Lectura Fácil, síntesis de voz, sintetizador de audio y ARIA
│   ├── workout.js             # Motor de temporizador, máquina de estados de entrenamiento y modo libre
│   └── app.js                 # Controlador principal de navegación, onboarding, dashboard y adaptación
├── manifest.json              # Configuración PWA para instalación en pantalla de inicio
├── service-worker.js          # Estrategia de almacenamiento en caché para soporte offline
└── README.md                  # Documentación del proyecto
```

---

## 🚀 Guía de Ejecución Local

1. Abrir la carpeta del proyecto en cualquier navegador moderno (Chrome, Edge, Firefox, Safari).
2. Abrir directamente `index.html` o servir mediante cualquier servidor local (por ejemplo con `npx serve` o la extensión Live Server de VS Code).
3. Para probar la instalación PWA, acceder mediante HTTPS o servidor local `http://localhost`.

---

## 🛡️ Descargo de Responsabilidad Médica

Esta aplicación ofrece una orientación general de actividad física saludable para adultos y no sustituye en ningún caso la valoración médica individualizada. Se recomienda consultar con un profesional de la salud antes de iniciar cualquier programa deportivo si existen condiciones médicas previas.
