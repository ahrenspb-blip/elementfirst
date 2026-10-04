# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Element First es una marca peruana de denim. La app la usan cuatro grupos, cada uno en su contexto:

- **Dueño y gerencia**, sobre todo desde el celular durante el día: revisan ventas, margen, stock y alertas.
- **Vendedores en tienda**, en celular o tablet con el cliente al frente: registran pedidos rápido y consultan tallas disponibles en su tienda.
- **Almacén y logística**, en computadora: reciben mercadería, cuadran stock y hacen órdenes de compra a proveedores.
- **Ventas por redes**, a partir de pedidos tomados por Instagram, WhatsApp o la web que se registran después en la app.

Cada usuario pertenece a un área: Tienda, Almacén, Logística o Soporte TI. Los administradores no tienen área.

## Product Purpose

Ser el sistema de gestión comercial de Element First ("Denim Intelligence"): ventas, inventario por talla y ubicación, clientes, canales, proveedores, órdenes de compra, reportes y control del personal en una sola aplicación.

Las cuatro prioridades, todas confirmadas:

1. **Vender rápido sin errores**: registrar un pedido en segundos, sin que el stock quede mal.
2. **Stock exacto por tienda**: saber qué talla hay en cada tienda o almacén y cuándo reponer.
3. **Ver cómo va el negocio**: ingresos, margen, canales y productos que se venden o se estancan.
4. **Control del personal**: permisos por área, ubicación asignada y trazabilidad de cada operación.

## Positioning

Está hecha a la medida de una marca de denim peruana:

- Stock por talla (28–36) y por ubicación.
- Tiendas físicas y canales digitales en un mismo lugar.
- Personal por área con acceso limitado a su tienda o almacén.
- Precios en soles (S/).

No es un ERP genérico adaptado.

## Operating Context

- **Ventas:** cada venta descuenta stock de una ubicación concreta (tienda o almacén) y pertenece a un canal: tienda física, Instagram, WhatsApp, web, etc.
- **Ventas válidas:** solo cuentan en las métricas las Completadas y las Pendientes. Las Devueltas y Canceladas se muestran aparte.
- **Órdenes de compra:** llegan a un almacén destino y suman stock al recibirse.
- **Tienda y Almacén:** su personal solo ve y opera su ubicación. Lo aplica la base de datos, no solo la pantalla.
- **Soporte TI:** revisa el Registro del sistema (errores, operaciones, trazas) y gestiona usuarios que no son administradores.
- **Idioma:** la app está en español de Perú.

## Capabilities and Constraints

- **Stack:**
  - `index.html` con el JavaScript integrado y minificado, más `styles.css` (Tailwind precompilado).
  - Supabase: base de datos con reglas de acceso por fila (RLS), funciones RPC, almacenamiento y la función `admin-usuarios`.
  - Vercel publica automáticamente al fusionar en `main`.
- **Instalable:** la app se puede instalar como aplicación (`manifest.json`, `sw.js`).
- **Reglas de trabajo confirmadas por el dueño:**
  - No reescribir ni "limpiar" código que funciona sin preguntar antes.
  - Publicar solo fusionando a `main`.
  - Probar cada cambio antes de publicarlo.
- **Datos personales:** DNI de 8 dígitos y sexo (hombre o mujer) por usuario. Cada usuario sube su propia foto de perfil.

## Brand Commitments

- **Nombre:** "Element First"; subtítulo "Denim Intelligence"; logo de texto "EF".
- **Dirección visual elegida por el dueño:** Denim índigo, documentada en DESIGN.md.
- **Voz:** español claro y directo, sin tecnicismos para el usuario. Los mensajes de error dicen qué pasó y qué hacer.

## Evidence on Hand

- Datos reales en Supabase:
  - Catálogo de jeans con tallas 28–36.
  - Almacenes: Almacén Principal, Tienda 1 y Tienda 2 activas; Tienda 3 desactivada.
  - Canales y proveedores.
- Todavía no hay ventas registradas en producción.
- No hay testimonios, métricas públicas ni fotos de producto profesionales. No inventarlos.

## Product Principles

1. **La venta primero**: registrar un pedido debe tomar segundos y no puede dejar el stock inconsistente.
2. **Cada número es real**: nada fijo ni de ejemplo. Si no hay datos, se dice "Sin ventas" en lugar de mostrar ceros engañosos.
3. **Cada quien ve lo suyo**: el área y la ubicación definen lo que cada persona ve y puede hacer, y la base de datos lo hace cumplir.
4. **Todo queda registrado**: cada operación es trazable desde el clic hasta la base de datos.
5. **Pensada para el celular**: el dueño y los vendedores la usan de pie, con una mano.

## Accessibility & Inclusion

- Contraste WCAG AA en el texto (4.5:1; 3:1 en texto grande e íconos).
- Áreas táctiles de 40–44 px en el celular.
- Texto funcional de 11 px como mínimo.
- Se puede usar con el teclado y lector de pantalla: controles con nombre y tablas desplazables con el teclado.
- Respeta la preferencia de "reducir movimiento".
