# BITÁCORA MAESTRA Y REGISTRO DE ESTADO: SKILL BLAST X
> **Documento de Contexto Persistente para Sesiones y Nuevas Conversaciones**  
> **Fecha de Actualización**: Noviembre 2026  
> **Versión Actual del Proyecto**: v1.2.4 (con mejoras post-release v1.2.5 en curso)  
> **Repositorio Oficial**: [luisfelipehernandez/SkillBlastX](https://github.com/luisfelipehernandez/SkillBlastX)  
> **Ruta Local del Proyecto**: `C:\Users\evilb\Downloads\game\skill_blast\`

---

## 1. VISIÓN GENERAL Y PROPÓSITO DEL DOCUMENTO

Este documento fue generado para condensar **todo el trabajo, arquitectura, reglas, auditorías y cambios implementados** a lo largo de las distintas conversaciones y etapas del desarrollo del simulador **Skill Blast X**.

> **IMPORTANTE PARA NUEVAS CONVERSACIONES DE IA**:  
> Al iniciar una conversación nueva, **basta con consultar este archivo** para tener el 100% del contexto del proyecto sin necesidad de releer las transcripciones anteriores, ahorrando casi la totalidad de la ventana de contexto y tokens.

---

## 2. IDENTIDAD Y STACK TECNOLÓGICO

* **Nombre del Juego**: **Skill Blast X** (Juego de cartas coleccionables / TCG original).
* **Naturaleza del Software**: Simulador oficial de escritorio y cliente web para juego de cartas competitivo 1v1.
* **Tecnologías**:
  * **Frontend / Motor de Interfaz**: HTML5, CSS3 moderno, JavaScript modular (Vanilla JS).
  * **Red / Multijugador**: PeerJS (WebRTC P2P) para partidas directas entre dos jugadores sin necesidad de un servidor dedicado pesado.
  * **Distribución de Escritorio**: Empaquetado ejecutable `SkillBlastX.exe` con auto-actualizador sincronizado con GitHub Releases (`version.json`).
  * **Testing Automatizado**: Suite en Node.js ejecutada mediante `ejecutar_tests.bat` y `tests/suite_runner.js`.

---

## 3. ESTRUCTURA Y ARQUITECTURA DEL REPOSITORIO

```text
C:\Users\evilb\Downloads\game\skill_blast\
│
├── cartas.json                    <- Base de datos con las 429 cartas oficiales y sus atributos
├── version.json                   <- Configuración de versión, repo_url y metadatos del instalador
├── ejecutar_tests.bat             <- Lanzador rápido de la suite de pruebas unitarias
├── README.md                      <- Manual general del proyecto
├── LEEME_INSTRUCCIONES.txt        <- Guía y reglas oficiales para los usuarios y jugadores
├── SkillBlastX.exe                <- Binario de lanzamiento de la aplicación de escritorio
│
├── deckbuilder/                   <- Núcleo del cliente web y simulador
│   ├── index.html                 <- Vistas: Menú principal (EDOPro-style), Deckbuilder, Mesa de Partida, Online, IA
│   ├── app.js                     <- Controlador central del juego, eventos UI, modales y máquina de estados
│   ├── style.css                  <- Estilos visuales, tapete de juego, animaciones y diseño responsive
│   ├── version.json               <- Versión sincronizada interna
│   └── js/
│       ├── core/rulesEngine.js    <- Motor de validación de reglas continuas y floodgates
│       ├── effects/expansionSetEffects.js <- Efectos específicos de expansiones complejas
│       ├── ai/                    <- Inteligencia Artificial competitiva
│       │   ├── aiEngine.js        <- Cerebro de toma de decisiones de la IA (sin trampas, respetando reglas)
│       │   └── executors/         <- Ejecutores temáticos por arquetipo (ej. harukaExecutor.js)
│       └── network/multiplayerEngine.js <- Conexión P2P, volado de moneda, sincronización de jugadas
│
├── imagenes/                      <- Assets gráficos y artes de las 429 cartas en alta resolución
├── mazos/                         <- Mazos predeterminados del usuario (formato JSON de 35 cartas)
├── mazos_ia/                      <- Mazos preconstruidos y optimizados para la IA
├── installer_build/               <- Scripts de empaquetado para distribución
└── tests/                         <- Suites de pruebas automatizadas por cartas y reglas
```

---

## 4. REGLAMENTO OFICIAL ESTANDARIZADO (REGLAS DEL SISTEMA)

1. **Estructura del Mazo**:
   * **Deck Principal**: Exactamente **35 cartas** obligatorias (sin excedentes ni faltantes).
   * **Side Deck**: Máximo **10 cartas** opcionales.
2. **Estructura Oficial del Turno (3 Fases)**:
   * **Inicio de Turno**: Robo obligatorio de 1 carta del deck y resolución de efectos disparados al inicio.
   * **Fase Principal**: Jugar personajes al campo, portar Skills a personajes compatibles, activar efectos de cartas y declarar ataques.
   * **Fin de Turno**:
     * Resolución de efectos disparados al final del turno.
     * **Regla Obligatoria de Penalización (Última acción del turno)**: Si un jugador no controla ningún Personaje en el campo al terminar su turno, está obligado a enviar 1 carta de Personaje de su banca al cementerio.  
       * *Excepción clave de regla*: Los Personajes con Evolución / Modo Avanzado están **expresamente exentos** de esta penalización de banca obligatoria.
3. **Terminología Oficial (Estandarizada)**:
   * Se dice **«Jugar»** un personaje al campo (no "invocar").
   * Se dice **«Partida»** (no "Duelo" ni "Batalla").
   * Se dice **«Portar»** una Skill a un personaje.
   * Las zonas son: **Campo**, **Banca**, **Mano**, **Deck**, **Side Deck** y **Cementerio**.
   * Regla **HOPT** (*Hard Once Per Turn*): Las cartas con restricción por turno quedan bloqueadas para cualquier otra copia con el mismo nombre en ese mismo turno.

---

## 5. HITOS CLAVE Y CRONOLOGÍA DE DESARROLLO

### Conversación 1: Fundación del Simulador, Multijugador Online e IA
* **ID**: `e73114e4-032f-4ea0-99cb-ed5ae8b59e02`
* **Logros alcanzados**:
  * Transformación de un visualizador estático inicial a un simulador interactivo completo inspirado en **EDOPro / Project Ignis**.
  * Creación del Menú Principal dinámico con navegación entre Menú, Constructor de Mazos, Mesa de Pruebas Offline, Duelo contra IA y Multijugador Online.
  * Implementación del motor de juego 1v1: slots de personajes, colocación boca abajo, volteo reglamentario, ataques a personajes rivales y ataques directos al oponente.
  * Implementación del modo **Multijugador Online P2P** con PeerJS: volado 3D de moneda inicial, elección de orden de turno, y sincronización estricta de mano, campo, banca, mazo y cementerio.
  * Flujo interactivo de revelación progresiva de cartas una a una para efectos como *«¡Desatar!»*.
  * Creación de mazos temáticos y cerebro de IA (`mazos_ia/` y `aiEngine.js`) que compite respetando las mismas reglas del jugador humano.
  * Implementación de mecánicas complejas: carta `BBX-SP429` (Ciclón de palma desde cementerio), `BBX-SP265` (Ocaso del pasado), `BBX-SP264` (Mapa), `BBX-SP245` (Haruka Modo arcano) y showcase central para activaciones defensivas como *«Resistir»*.
  * Configuración del auto-actualizador conectado al repositorio de GitHub (`version.json`).

### Conversación 2: Gran Auditoría de las 429 Cartas, Erradicación de Fallos y v1.2.4
* **ID**: `00ae6d88-5c85-4e2f-9570-5a102fa1b8b1`
* **Logros alcanzados**:
  * **Auditoría Integral del 100% de las 429 cartas**:
    * Análisis meticuloso arquetipo por arquetipo: *Lyna* (22), *Haruka* (31), *Marina* (33), *Katherine* (29), *Tagero/Roy* (48), *Eishet/Void-oh* (34), *Katshi/Sophia/Bao* (47), *Nara/Ryu-chan/Nobuko* (38), *Helica/Chiako/Deida* (58) y *Universales/Neutras* (92).
  * **Erradicación Total de Selecciones Ciegas**:
    * Eliminación sistemática de asignaciones indebidas `[0]` o selecciones aleatorias en efectos de búsqueda.
    * Implementación de modales interactivos (`openCardChooserModal` y selecciones múltiples) para que el jugador siempre elija voluntariamente sus cartas según el texto oficial.
  * **Corrección de 8 Bugs Críticos del Motor de Cartas**:
    1. **`BBX-SP327` (Lyna)**: Se implementó su efecto continuo de bloqueo de efectos en cementerio (`rulesEngine.js`).
    2. **`BBX-SP325` («Por allá...»)**: Modal interactivo para elegir si agregar desde el deck o del cementerio.
    3. **`BBX-SP143` (Colgante de Marina)**: Modal de búsqueda interactiva en lugar de tomar del tope a ciegas.
    4. **`BBX-SP088` («¡Espiral de fuego!» de Katherine)**: Modal múltiple interactivo con tope dinámico según el tamaño de la mano.
    5. **`BBX-SP149` (Tagero)**: Corrección de ID de carta referenciada (`SP021` «¡Explosión trueno!» en lugar de `SP023`).
    6. **`BBX-SP050` (Maniobra de fuego de Roy)**: Eliminado descarte fantasma de 3 cartas del mazo e integrada selección interactiva en cementerio.
    7. **`BBX-SP316` y `BBX-SP328` (Encantamiento y Caos carmesí de Eishet)**: Selección modal paso a paso de skills portadas.
    8. **`BBX-SP314` (Encriptar de Chiako)**: Programación completa de `executeEncriptarSP314` con doble modal de envío y búsqueda.
  * **Suite Automatizada de Pruebas Unitarias**:
    * Creación de `tests/suite_runner.js` y `ejecutar_tests.bat` para certificar todas las familias de cartas antes de cada release.
  * **Lanzamiento v1.2.4**:
    * Publicación del release oficial con las 429 cartas validadas y documentación de auditoría.

### Conversación 3: Control de Estado y Planificación de Bitácora
* **ID**: `86272b02-fc72-4d8f-af34-d05be0be0e78`
* **Logros alcanzados**:
  * Verificación de límites de tokens y decisión estratégica de pausar la sesión para esperar el reinicio de cuota y consolidar esta bitácora definitiva.

### Mejoras Recientes Post-v1.2.4 (Commits `8d30b62` a `0897b20`):
* **Estandarización Terminológica Global**: Reemplazo de los términos "Duelo" y "Batalla" por el término oficial **«Partida»** en toda la interfaz, mensajes y manuales.
* **Mejoras Visuales**:
  * Corrección del renderizado en la activación central (mostrar siempre la carta real disparada).
  * Rediseño y ajuste de escala de las Skills equipadas para evitar que se desborden de las ranuras de personajes en pantallas compactas.
* **Gameplay & Balance de IA**:
  * Restricción estricta de Skills arcanas en Haruka únicamente para su versión avanzada (evitando que la versión básica las porte).
  * Ocultación de la inspección de mano rival en multijugador para respetar la niebla de guerra.
  * Preservación del mazo de la IA al reiniciar la partida para no forzar la reconfiguración manual.

---

## 6. ESTADO ACTUAL, ROADMAP Y PLANES A FUTURO

* [x] **Base de Datos y Cartas**: 429/429 cartas implementadas, funcionales y libres de selecciones ciegas (`[0]`).
* [x] **Modo Multijugador P2P**: Operativo con PeerJS, volado 3D, selección de orden y niebla de guerra.
* [x] **Modo VS IA**: Operativo con mazos temáticos competitivos y respeto a las reglas humanas.
* [x] **Suite de Tests**: Ejecutable localmente con `ejecutar_tests.bat`.
* [ ] **Ajuste en Mazos**: `mazos/deida.json` contiene cambios locales de composición pendientes de commit/revisión.
* [ ] **Entrega a Beta Testers**: Distribuir el juego con la versión 1.2.4/1.2.5 a los probadores para detectar casos de borde en partidas reales.
* [ ] **Calibración Continua de IA**: Mejorar la toma de decisiones en partidas prolongadas y evaluar sinergias con cartas universales.
* [ ] **Futuras Expansiones y Banlist**: Soporte para incorporar nuevos bloques de cartas y balances competitivos de cartas limitadas/semilimitadas.

---

## 7. PROTOCOLO DE VERSIONADO, SUBIDA A GITHUB Y AUTO-ACTUALIZADOR

Para asegurar que los jugadores y beta testers reciban las actualizaciones sin reinstalar manualmente:
1. **Sistema de Doble `version.json`**:
   - `version.json` (raíz): Controla la versión global, fecha de release y URLs de descarga de GitHub.
   - `deckbuilder/version.json`: Controla la insignia visual mostrada en el menú principal del juego.
   - Al publicar una versión (ej. de 1.2.4 a 1.2.5), **ambos archivos deben incrementarse de manera sincronizada**.
2. **Repositorio Remoto**:
   - URL: `https://github.com/luisfelipehernandez/SkillBlastX`
   - Rama principal: `main`.
3. **Flujo de Publicación**:
   - Realizar cambios y validarlos con `ejecutar_tests.bat`.
   - Incrementar versión en los dos `version.json`.
   - Ejecutar `git add .`, `git commit -m "feat/fix: ..."` y `git push origin main`.
   - El ejecutable `SkillBlastX.exe` de los jugadores consulta automáticamente el repositorio en GitHub al iniciar y descarga los archivos actualizados de forma transparente.

---

## 8. CÓMO USAR ESTE ARCHIVO EN NUEVAS CONVERSACIONES

Cuando abras una nueva conversación en el chat y vayas a trabajar en este proyecto, solo indícale al asistente:
> *"Estamos trabajando en el proyecto Skill Blast X. Consulta el archivo `BITACORA_PROYECTO_SKILL_BLAST.md` ubicado en el directorio del proyecto para tener todo el contexto de lo que hemos hecho y continuar desde allí."*

Con eso, el asistente sabrá exactamente de qué trata el juego, las 429 cartas, las reglas oficiales, la arquitectura del código y el estado de avance sin gastar tokens de más.
