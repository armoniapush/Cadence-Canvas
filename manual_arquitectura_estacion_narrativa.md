# PLAN MAESTRO Y DIRECTIVA DE CONSTRUCCIÓN PARA AGENTE DE IA: ESTACIÓN DE MONTAJE NARRATIVO

---

## 1. Propósito de este Instructivo (Directiva para el Agente Constructor)

Este documento constituye las órdenes de ingeniería y diseño conceptual para que un agente de inteligencia artificial construya, de principio a fin, la **Estación de Montaje Narrativo**.

Tu misión como agente constructor no es programar otro procesador de texto tradicional ni un clon de carpetas jerárquicas. Tu misión es materializar un **entorno de orquestación espacial de historias**, donde la estructura macro de la novela, la redacción micro de cada escena, la memoria causal del mundo y el control por consola convivan sobre una misma fuente de verdad local.

---

## 2. La Idea Central: De la Tiranía Lineal a la Orquestación Espacial

Los programas de escritura tradicionales asumen que el cerebro humano concibe una obra literaria en línea recta, desde la primera palabra hasta la última. Sin embargo, las novelas complejas se comportan como un sistema vivo de fuerzas simultáneas: mientras un protagonista sufre una emboscada en el norte, una facción conspira en la capital y una reliquia cambia de manos en las sombras.

Cuando el autor intenta escribir esto en un rollo de papel continuo, sufre tres fracturas cognitivas:
1. **Pérdida de escala y ritmo:** Al sumergirse en los párrafos de un capítulo, olvida en qué punto de tensión se encuentra respecto a la totalidad de la obra.
2. **Ceguera de simultaneidad:** No puede ver qué está ocurriendo al mismo tiempo en las demás tramas.
3. **Amnesia de continuidad:** Pierde el rastro de qué sabe cada personaje en ese instante exacto del tiempo o qué leyes del mundo están activas en esa región.

Para resolver esto de raíz, construirás una aplicación de escritorio local donde la novela se organiza en una **matriz de tiempo e hilos argumentales**, se redacta en **cápsulas atómicas asistidas por radares periféricos** y se valida mediante un **grafo relacional vivo**.

---

## 3. Los Cuatro Órganos que Debes Construir

El sistema se divide en cuatro subsistemas que operan sobre el mismo archivo de proyecto local:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ARQUITECTURA DE LOS CUATRO ÓRGANOS                        │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  1. EL LIENZO DE TRAMAS              │  2. EL EDITOR CON CONCIENCIA         │
│     (Orquestación Macro)             │     PERIFÉRICA (Redacción Micro)     │
│  • Carriles por personaje o trama    │  • Foco limpio en la escena activa   │
│  • Bloques de escena desplazables    │  • Radar Temporal Superior (Minimap) │
│  • Eje de simultaneidad temporal     │  • Ventana de Contexto Simultáneo    │
│  • Curva visual de tensión dramática │  • Menciones vivas (@, #, !)         │
├──────────────────────────────────────┼──────────────────────────────────────┤
│  3. LA MATRIZ DE WORLDBUILDING       │  4. PUENTE DE CONTROL POR TERMINAL   │
│     (Memoria Causal del Universo)    │     (CLI & Copiloto de IA)           │
│  • Grafo de facciones, leyes y seres │  • Lectura de estructura sin ventana │
│  • Subgrafo local de 1-salto         │  • Auditoría de continuidad          │
│  • Guardián de coherencia temporal   │  • Inyección y edición en vivo       │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Órgano 1: El Lienzo de Tramas (La Vista del Arquitecto)
Construirás un lienzo horizontal dividido en **carriles argumentales**.
* **Los Carriles:** Cada fila horizontal pertenece a un punto de vista (POV), una subtrama o una facción. El autor puede crear, renombrar, colorear, reordenar verticalmente o silenciar carriles (para excluirlos temporalmente de una exportación sin borrarlos).
* **Los Bloques de Escena:** Dentro de cada carril, el autor coloca tarjetas horizontales que representan escenas individuales. El ancho visual del bloque refleja su peso o extensión, y su posición horizontal refleja **el momento cronológico en que ocurre dentro del mundo**.
* **La Regla de Ensamblado por Barrido:** Como dos o más escenas pueden estar alineadas en el mismo punto horizontal (ocurren al mismo tiempo en la ficción), implementarás un algoritmo de barrido que lee el lienzo de izquierda a derecha; cuando encuentra escenas simultáneas, las ordena para el lector respetando la jerarquía vertical de los carriles (de arriba hacia abajo).

### Órgano 2: El Editor Atómico con Conciencia Periférica (La Vista del Prosista)
Al hacer doble clic en cualquier bloque del lienzo, llevarás al autor al espacio de escritura de esa única escena. Para evitar que pierda la visión global de la trama mientras redacta, el editor debe incluir tres instrumentos de navegación periférica:
* **El Radar Temporal Superior:** Una franja horizontal delgada y permanente en el borde superior del editor que representa el libro entero dividido por actos. Una marca luminosa le indica al autor exactamente en qué porcentaje de la obra está parado y qué escenas preceden o siguen a la actual en ese mismo hilo.
* **El Panel de Contexto Simultáneo:** Una columna lateral conmutable con un atajo rápido que muestra en tono atenuado el texto o el resumen de las escenas que están ocurriendo **al mismo tiempo** en los otros carriles del lienzo. Así el autor puede entrelazar ecos, contrastes o consecuencias entre capítulos paralelos sin salir de su página.
* **Vínculos Semánticos Instantáneos:** Cuando el autor escriba símbolos disparadores dentro de su prosa (`@` para personajes, `#` para lugares o conceptos, `!` para objetos o reliquias), se desplegará un selector rápido que enlaza esa palabra directamente con la entidad de la base de datos. Al pasar el cursor sobre el nombre, se mostrará su ficha resumida sin interrumpir la escritura.

### Órgano 3: La Matriz de Worldbuilding y Continuidad (La Memoria del Mundo)
Construirás un sistema de fichas y un mapa de nodos donde el autor registra los elementos de su universo y traza flechas de relación entre ellos (*Aliado de*, *Traicionó a*, *Gobierna en*, *Posee*).
* **El Subgrafo de Escena (Ego-Graph):** Cuando el autor esté escribiendo una escena en el Editor Atómico, no le mostrarás el mapa entero del mundo. Filtrarás automáticamente el grafo para mostrar en una esquina **únicamente los nodos de los personajes y lugares mencionados en esa escena y las flechas directas que los conectan entre sí**.
* **Estado del Mundo en el Tiempo:** Cada relación o secreto puede tener asignada la escena en la que se revela o cambia. El panel lateral le recordará al autor qué sabe y qué ignora cada personaje en ese punto específico de la línea temporal, evitando anacronismos.

### Órgano 4: La Interfaz de Línea de Comandos para Agentes de IA (CLI Bimodal)
Diseñarás el núcleo del programa de forma que no dependa de la pantalla para funcionar. Tanto la ventana visual como una herramienta de consola operarán sobre el mismo archivo de datos local:
* **Acceso para Agentes Externos:** Un agente de inteligencia artificial podrá ejecutar órdenes desde la terminal para consultar el mapa de tramas, leer el contenido de cualquier escena, auditar si un personaje tiene huecos argumentales o verificar contradicciones con las reglas del mundo.
* **Escritura y Sincronización en Vivo:** Si el agente de IA recibe la orden por terminal de crear un esqueleto de escenas, redactar un borrador o agregar una relación entre dos facciones, ese cambio se guardará en el motor central y **aparecerá instantáneamente en la pantalla del autor** sin bloqueos ni pérdidas de datos.

---

## 4. Secuencia de Construcción para el Agente (Paso a Paso)

Para garantizar que construyas este sistema de manera sólida, sin errores de integración ni piezas huérfanas, debes ejecutar el desarrollo siguiendo estrictamente este orden de cuatro etapas:

```
[ ETAPA 1: EL CORAZÓN DE DATOS Y LA TERMINAL ]
  Crear la base de datos local y los comandos de lectura/escritura
  que funcionan tanto para la pantalla como para la consola CLI.
                        │
                        ▼
[ ETAPA 2: EL LIENZO ESPACIAL Y EL ENSAMBLADOR ]
  Construir la vista de carriles, el movimiento de bloques de escena
  y el motor que une todas las piezas en un manuscrito Word o Markdown.
                        │
                        ▼
[ ETAPA 3: EL EDITOR ATÓMICO Y LAS MENCIONES VIVAS ]
  Integrar el procesador de prosa de cada escena con el autocompletado
  de entidades (@, #, !) y el guardado instantáneo.
                        │
                        ▼
[ ETAPA 4: LOS RADARES PERIFÉRICOS Y EL GRAFO DEL MUNDO ]
  Activar el minimapa superior, la vista de escenas simultáneas y el
  mapa de relaciones filtrado por escena.
```

### Etapa 1: El Cimiento Local y la Bimodalidad
1. Establece primero el almacén de datos en un único archivo local de alta velocidad que soporte lecturas y escrituras simultáneas.
2. Define las cinco estructuras esenciales: **Proyectos**, **Entidades del Mundo** (escenas, personajes, facciones, lugares, objetos), **Hilos Argumentales** (los carriles), **Ubicaciones en el Lienzo** (coordenada temporal y duración de cada escena) y **Relaciones del Mundo** (vínculos entre entidades).
3. Expón las funciones centrales para que puedan ser llamadas tanto por la interfaz visual como por comandos de terminal. No avances a la interfaz gráfica hasta que puedas crear un hilo, insertar una escena y exportar un texto de prueba directamente mediante una orden interna.

### Etapa 2: El Lienzo de Tramas y el Motor de Ensamblado
1. Construye la pantalla principal con la columna izquierda para las cabeceras de los hilos argumentales y el área central desplazable para el eje cronológico.
2. Permite que el autor cree bloques de escena, los arrastre horizontalmente en el tiempo o los cambie de un carril a otro, guardando cada movimiento al instante.
3. Implementa el botón de **Ensamblar Manuscrito**: debe recorrer los carriles activos de izquierda a derecha y de arriba hacia abajo, tomando el texto de cada escena para generar un documento limpio y continuo en formato Word o Markdown con sus respectivos saltos de capítulo.

### Etapa 3: El Editor Atómico y los Vínculos del Mundo
1. Conecta el doble clic de cada bloque del lienzo para abrir el editor enfocado en esa escena.
2. Configura los disparadores `@`, `#` y `!` para que busquen en tiempo real entre los personajes, lugares y objetos creados en el proyecto, insertando etiquetas interactivas dentro del párrafo.
3. Asegura que cada palabra escrita actualice automáticamente el conteo de palabras del bloque en el lienzo principal.

### Etapa 4: Conciencia Periférica y Grafo de Worldbuilding
1. Construye la vista del Grafo de Worldbuilding donde el autor pueda crear tarjetas de entidades y unirlas con líneas etiquetadas.
2. En el Editor Atómico, añade la barra superior con el **Radar Temporal** (mostrando en qué punto de la novela está la escena activa respecto a las demás).
3. Añade al lateral del editor las dos herramientas de asistencia: la pestaña de **Contexto Simultáneo** (que busca y muestra las escenas de otros carriles cuya posición temporal coincida con la escena actual) y el **Subgrafo Local** (que dibuja únicamente las conexiones de los elementos mencionados en el texto presente).

---

## 5. Reglas de Calidad Innegociables para el Agente

Al desarrollar cada pantalla y función, debes respetar cuatro leyes de hierro:

* **Prohibido usar datos simulados o falsos:** Todo botón en la pantalla (crear hilo, mover escena, enlazar personaje, exportar libro) debe estar conectado de extremo a extremo con la base de datos real.
* **Cero pérdida de contexto:** El autor nunca debe sentirse encerrado en una caja ciega; el paso entre el mapa general, el texto de la escena y las relaciones del mundo debe ocurrir en una fracción de segundo y sin recargas de página.
* **Respeto absoluto por el texto del autor:** El guardado debe ser continuo, silencioso e instantáneo ante cada pausa de escritura, manteniendo copias de respaldo automáticas en el disco local.
* **Claridad visual y sobriedad:** La interfaz debe utilizar un tema oscuro descansado para la vista, donde los únicos acentos de color provengan de la identidad cromática de cada hilo argumental y de las etiquetas de las entidades del mundo.