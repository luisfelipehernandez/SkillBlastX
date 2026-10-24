# Skill Blast X - Creador de Mazos (Deckbuilder)

¡Bienvenido! Este espacio está diseñado para ayudarte a organizar tus cartas de **Skill Blast X** y poder armar mazos de forma estratégica con la ayuda de tu asistente de IA.

---

## Reglas Básicas del Juego (Referencia)

*   **Objetivo:** Derrotar a 3 personajes del oponente.
*   **Construcción del Mazo (Deckbuilding):**
    *   El mazo principal debe tener exactamente **35 cartas** obligatorias.
    *   Se permite un máximo de **3 copias** de una misma carta (a menos que la banlist oficial indique lo contrario). **Nota:** Existen cartas que comparten el mismo nombre pero tienen diferente arte y efecto (por ejemplo, múltiples versiones de "Marina"). Por ello, el número de serie (ID) es el identificador único fundamental para diferenciarlas.
    *   El mazo lateral (**Side Deck**) puede tener cualquier cantidad de cartas hasta un máximo de **10 cartas**.
*   **Costes y Restricciones de las Cartas:**
    *   **Sin Coste de Recursos:** Las cartas no tienen un coste de recursos o invocación tradicional (como sacrificios o maná).
    *   **Coste por Efecto:** El "coste" se paga mediante acciones requeridas por los propios efectos de las cartas (ej. descartar una Skill equipada para activar un efecto).
    *   **Portador de Skills:** Ciertas cartas de tipo *Skill* especifican *"Esta carta solo puede ser portada por [Personaje]"*, lo que limita su equipamiento únicamente a dicho personaje o personajes nombrados.
*   **Preparación de la Partida (Setup):**
    1. Cada jugador elige un monstruo de su mazo y lo coloca boca abajo (este será su personaje inicial).
    2. Se lanza un dado; el ganador decide quién comenzará la batalla.
    3. Ambos jugadores roban sus 3 cartas iniciales.
    4. Se revelan los personajes iniciales (se voltean boca arriba) y comienza el juego.
*   **Dinámica de Combate:** Los personajes equipan "Skills" (habilidades/defensas). Al atacar o defender, ambos personajes pierden 1 Skill. Si un personaje sin Skills es atacado, es derrotado.
    *   **Destrucción por batalla:** Incluye tanto la acción de perder 1 Skill en un personaje como el desplazar 1 Personaje sin Skills a la banca.
*   **Límite en Campo:** Cada jugador puede tener un máximo de **3 personajes** en el campo de batalla al mismo tiempo.
*   **Formas Avanzadas (Evolución):** Las formas avanzadas de los personajes se invocan colocándolas directamente encima de cualquiera de sus versiones normales en el campo (por ejemplo, *Deida (Arcángel)* encima de cualquier *Deida*). Esta invocación se puede realizar incluso en el mismo turno en el que se invocó al personaje normal original.
*   **Zonas del Juego:**
    *   **La Banca:** Zona exclusiva donde van los personajes derrotados o enviados allí por efectos. **Solo se roba 1 carta si el personaje es destruido en batalla** (el controlador roba, no ambos a menos que la destrucción sea mutua). No se roba carta si es enviado a la banca por efectos.
    *   **El Cementerio:** Zona separada donde van las demás cartas (como cartas de acción/soporte jugadas) y monstruos/personajes descartados directamente de la mano para activar efectos.
*   **Turnos y Juego:**
    *   El jugador que va primero no roba carta en su primer turno.
    *   Atacar gira al personaje (posición horizontal).
    *   **Sin personaje al final del turno:** Si al final de tu turno no tienes un personaje activo en juego, debes colocar uno de tu mazo en la banca. Inmediatamente después de esto, tu turno termina y comienza el del oponente.
*   **Reglas de Torneo Oficial y Estructura de Partida:**
    *   **Mejor de 3 (Bo3):** Las partidas oficiales son al mejor de 3 batallas.
    *   **Tiempo de Ronda:** El tiempo máximo por ronda de torneo es de **30 minutos**.
    *   **Side Decking:** El tiempo máximo permitido para realizar cambios con el Side Deck entre partidas de un Bo3 es de **2 minutos**.
    *   **Protectores Obligatorios (Sleeves):** Es obligatorio el uso de protectores. Todos deben ser del mismo color y tamaño en todas las cartas (incluyendo el Side Deck).
    *   **Regla de Barajar tras Revelar:** Cualquier carta que incluya "Revelar" en su texto y modifique el estado de tu deck (como buscar o añadir cartas desde él), requiere de barajar el mazo después de resolver su efecto. Esto no aplica si el texto indica que tu adversario debe revelarte alguna carta (ej. las Skills propias de Chiako).

---

## Banlist Oficial (Lista de Prohibidas y Limitadas)

### Prohibidas (0 copias por mazo)
*   **Bao** (`BBX-SP013`)
*   **Ventaja** (`BBX-SP073`)
*   **Remembranza** (`BBX-SP221`)
*   **Nara** (`BBX-SP184`)
*   **Primer movimiento** (`BBX-SP139`)

### Limitadas (Máximo 1 copia por mazo)
*   **Eishet** (`BBX-SP326`)
*   **Katshi** (`BBX-SP192`)
*   **Eishet** (`BBX-SP357`)
*   **Bajo la luz lunar** (`BBX-SP341`)
*   **Fanfarroneo** (`BBX-SP082`)
*   **Sophia** (`BBX-SP171`)
*   **Cambio de fuego** (`BBX-SP038`)
*   **Tagero** (`BBX-SP164`)
*   **Katshi** (`BBX-SP205`)
*   **Encaminar** (`BBX-SP037`)

### Semilimitadas (Máximo 2 copias por mazo)
*   **Masacre** (`BBX-SP202`)
*   **Objetivo localizado** (`BBX-SP110`)
*   **Despliegue** (`BBX-SP092`)
*   **Bao** (`BBX-SP046`)

---

## Estructura del Proyecto

*   **`cartas.json`**: La base de datos en texto de todas tus cartas.
*   **Carpeta `imagenes/`**: Aquí debes guardar las fotos de tus cartas físicas (por ejemplo, `SB-001.jpg`).

## ¿Cómo agregar nuevas cartas?

1.  **A través del chat (Recomendado):**
    Dime los datos de la carta por aquí (o una transcripción/foto) y yo actualizaré el archivo `cartas.json` por ti.
2.  **Editando el archivo directamente:**
    Abre `cartas.json` y añade nuevos bloques en el formato JSON.
