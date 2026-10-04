---
name: Element First — El Taller de Denim
description: Herramienta de gestión de una marca peruana de denim, con índigo crudo, papel de etiqueta, remaches de cobre y costura.
colors:
  indigo: "#2B4680"
  indigo-hover: "#223868"
  indigo-ink: "#243B6C"
  indigo-soft: "#EDF0F7"
  indigo-raw-1: "#1D2A4C"
  indigo-raw-2: "#152039"
  copper: "#A65A24"
  copper-light: "#E2A577"
  paper: "#F4F2EC"
  surface: "#FFFFFF"
  surface-subtle: "#F8F7F3"
  ink: "#171B29"
  ink-2: "#3D3B37"
  muted: "#67625A"
  faint: "#6F6A62"
  line: "#E7E3DA"
  line-strong: "#D8D3C8"
  ok: "#2F7A58"
  warn: "#9C6410"
  bad: "#B23B30"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "46px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.028em"
  metric:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.006em"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  gutter-mobile: "16px"
components:
  button-primary:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.indigo-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "42px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  hero-card:
    backgroundColor: "{colors.indigo-raw-1}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "28px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "42px"
  chip-active:
    backgroundColor: "{colors.indigo-soft}"
    textColor: "{colors.indigo}"
    rounded: "{rounded.pill}"
  sidebar:
    backgroundColor: "{colors.indigo-raw-1}"
    textColor: "{colors.surface}"
    width: "244px"
---

# Design System: Element First

## Overview

**El Taller de Denim.** La app es el taller de trabajo de una marca de jean: índigo crudo como la tela sin lavar, fondo cálido de papel como una etiqueta, cobre de remache para lo importante y la costura como detalle de oficio. Es una herramienta seria para el día a día (vender, cuadrar stock, decidir), con la identidad de la marca en los detalles y no en el decorado.

El estilo es sobrio, cálido y preciso. La interfaz se hace a un lado frente al trabajo; la marca se reconoce en tres cosas: el índigo, la sarga y el cobre.

**Lo que no debe parecer:** la plantilla SaaS genérica de antes, con barra lateral azul marino, botones azul brillante, logo naranja con brillo, sombras de colores y títulos en mayúsculas espaciadas.

## Colors

Pocos colores y bien medidos: neutros cálidos, un índigo que lleva todas las acciones y un cobre que se reserva para la marca y lo urgente.

### Primary
- **Índigo de jean** (`indigo`): botones principales, enlaces, selección, estado activo y foco. Con texto blanco tiene contraste alto.
- **Índigo crudo** (`indigo-raw-1` → `indigo-raw-2`): superficies de marca. Son la barra lateral, la tarjeta "Ventas de hoy", el resumen de Reportes y el panel del login. Siempre llevan la sarga.

### Secondary
- **Cobre de remache** (`copper`, `copper-light` sobre índigo): el logo "EF", el contador de alertas, el punto de notificación, el ícono de la sección activa y la costura punteada. Nunca se usa para botones ni para texto largo.

### Neutral
- **Papel** (`paper`): fondo de la app y del login. Es cálido, no blanco.
- **Superficie** (`surface`) y **superficie suave** (`surface-subtle`): tarjetas y bloques internos.
- **Tinta** (`ink`, `ink-2`) para el texto principal; **apagado** (`muted`) y **tenue** (`faint`) para el texto secundario y los placeholders. Ambos cumplen AA (≥4.5:1) sobre papel y blanco.
- **Línea** (`line`, `line-strong`): bordes finos y divisiones.
- **Estados** (`ok`, `warn`, `bad`): verde salvia, ocre y rojo ladrillo, apagados. Son legibles como texto sobre blanco.

### Named Rules
**La Regla del Remache.** El cobre aparece solo donde un remache tendría sentido: la marca y lo que pide atención. Si un elemento de cobre no es marca ni alerta, va en índigo o en neutro.

**La Regla del Contraste.** Todo texto, incluidos los placeholders, cumple 4.5:1. Los íconos decorativos cumplen 3:1. Si un gris no llega, se oscurece; no se agranda.

## Typography

Una sola familia, **Archivo** (grotesca de origen industrial, como las etiquetas y la ropa de trabajo), para títulos, etiquetas, botones y datos. Los pesos son contenidos: 400 para el texto, entre 550 y 650 para los títulos y etiquetas, y nunca 800 en la interfaz. Los números van con cifras de ancho fijo (`tabular-nums`) para que las columnas se alineen.

### Hierarchy
- **Display** (46 px, peso 600): solo para la cifra principal de "Ventas de hoy". En el celular baja a 38 px.
- **Título** (26 px, peso 650): saludo y títulos de página. En el celular, 22 px.
- **Métrica** (24 px, peso 650): valores de las tarjetas de indicadores. En el celular, entre 20 y 21 px. Un monto nunca se recorta con puntos suspensivos.
- **Cuerpo** (14 px): texto general y celdas.
- **Etiqueta** (12.5 px, peso 550, tipo oración): etiquetas de campos, encabezados de tabla y nombres de indicadores.
- **Mínimo funcional:** 11 px. Nada que el usuario tenga que leer va por debajo.

### Named Rules
**La Regla de la Oración.** Las etiquetas, encabezados de tabla y títulos de sección se escriben en tipo oración. No se ponen títulos pequeños en mayúsculas espaciadas encima de otros títulos. Solo las píldoras de estado (como "STOCK BAJO") van en mayúsculas.

## Layout

- **Escritorio:** barra lateral índigo fija de 244 px y contenido de hasta 1500 px de ancho.
- **Celular:**
  - Barra superior con logo, título, buscar, menú, alertas y perfil.
  - Barra inferior con Inicio, Ventas, Stock, Alertas y Más.
  - Margen lateral de 16 px.
- **Menú:** está ordenado por área (General, Tienda, Almacén, Logística, Soporte TI y Cuenta). Las secciones sin pantallas visibles se ocultan.
- **Tablas:** en el celular, las tablas anchas se desplazan dentro de su tarjeta y se pueden recorrer con el teclado. La lista de Clientes pasa a tarjetas.
- **Indicadores:** se ordenan en cuadrícula, cinco columnas en escritorio, tres en tableta y dos en el celular.

## Elevation & Depth

La app es casi plana. Las tarjetas se separan del fondo de papel con un borde fino de color `line`, sin sombra. La sombra se reserva para lo que de verdad flota (hojas laterales, ventanas, avisos) y para la tarjeta índigo principal, que tiene una sombra suave hacia abajo.

### Named Rules
**La Regla de la Sarga.** La textura de la tela (líneas diagonales finas, a 0.032 de opacidad) solo va sobre índigo crudo: barra lateral, "Ventas de hoy", resumen de Reportes y panel del login. No lleva brillos radiales ni resplandores.

**La Regla de la Costura.** La costura punteada en cobre aparece una vez por pantalla como máximo, dentro de la tarjeta índigo principal. Es el detalle de oficio, no un recurso decorativo.

## Shapes

Las curvas son moderadas y van de menor a mayor según el tamaño:
- 8 px en elementos internos.
- 10 px en botones y campos.
- 14 px en tarjetas.
- 18 px en la tarjeta índigo y en las ventanas.
- Las píldoras (filtros, estados, segmentos) son completamente redondas.
- Los avatares son círculos y muestran la foto o las iniciales.

## Components

### Buttons
- **Principal:** índigo con texto blanco, 42 px de alto y sin brillo de color. Al pasar el mouse se oscurece; al presionarlo se encoge un 2 %.
- **Secundario:** blanco con borde fino.
- **Sobre índigo:** botón blanco ("Nuevo pedido") y botón con borde translúcido ("Ver ventas").
- **Foco visible:** contorno índigo de 2 px.

### Chips
Los filtros y segmentos son píldoras. El activo lleva fondo índigo suave y texto índigo, y el contador va dentro de la píldora.

### Cards / Containers
- **Tarjetas:** blancas, con borde `line`, radio de 14 px y sin sombra.
- **Bloques dentro de una tarjeta:** van sin borde, con fondo `surface-subtle`. Nunca se anida una tarjeta con borde dentro de otra.
- **Indicadores:** ícono índigo sin caja, etiqueta, cifra y una línea de contexto ("vs periodo anterior", "Sin ventas").

### Inputs / Fields
Blancos, con borde `line-strong`, 42 px de alto y radio de 10 px. Al enfocarlos, el borde pasa a índigo con un anillo suave. Los buscadores llevan el ícono a la izquierda, y los placeholders cumplen el contraste AA.

### Navigation
- **Escritorio:**
  - Barra lateral de índigo crudo con sarga, logo cobre "EF" y el nombre con letras espaciadas.
  - Títulos de sección a 11 px.
  - Enlace activo con fondo translúcido y el ícono en cobre claro.
- **Celular:** barra inferior blanca con el activo en índigo, y la hoja "Más" con las secciones por área.

### Tarjeta "Ventas de hoy" (componente propio)
- Índigo crudo con sarga y costura punteada.
- La cifra del día va en tamaño display.
- Lleva los botones "Nuevo pedido" y "Ver ventas".
- Al lado, "Salud del negocio" agrupa cuatro métricas en bloques translúcidos.

## Do's and Don'ts

### Do:
- **Do** usar índigo para cada acción y estado activo, y cobre solo para la marca y las alertas (La Regla del Remache).
- **Do** mostrar siempre datos reales; si no hay, decir "Sin ventas" o "Todo en orden".
- **Do** mantener el texto secundario en `muted` o `faint` (AA) y el texto funcional en 11 px o más.
- **Do** dejar en el celular áreas táctiles de 44 px en la barra superior y 40 px en los controles en línea.
- **Do** dejar que los montos se lean completos: "S/" pegado a la cifra y sin recortar con puntos suspensivos.

### Don't:
- **Don't** volver al azul brillante, al naranja con brillo ni a las sombras de colores de la versión anterior.
- **Don't** poner brillos radiales, texto con degradado ni efectos de vidrio decorativos.
- **Don't** usar títulos pequeños en mayúsculas espaciadas sobre los títulos (La Regla de la Oración).
- **Don't** anidar tarjetas con borde ni usar bordes de color de más de 1 px a un lado de tarjetas y alertas.
- **Don't** poner la sarga ni la costura fuera de las superficies índigo (Reglas de la Sarga y la Costura).
