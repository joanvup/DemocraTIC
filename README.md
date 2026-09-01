# Sistema de Elecciones Escolares de Personería 2026 🗳️

Sistema integral, seguro y en tiempo real para votación escolar y gestión democrática institucional. Diseñado para garantizar **anonimato total del voto**, prevención estricta de doble sufragio, verificación criptográfica con carnets QR (HMAC-SHA256), emisión de actas oficiales en PDF y transmisión en vivo por videobeam con Server-Sent Events (SSE).

---

## 🚀 Acceso Rápido y Credenciales

### 1. Panel de Administración
* **Ruta:** `/admin` o `/dashboard` (también accesible desde el botón superior en la estación de votación)
* **Credenciales Superadministrador:**
  * **Usuario:** `admin`
  * **Contraseña:** `Admin2026!*`
* **Credenciales Monitor de Mesa:**
  * **Usuario:** `monitor`
  * **Contraseña:** `Monitor2026!*`

### 2. Estación de Votación Táctil
* **Ruta:** `/` o `/votar`
* **Códigos ID de prueba pre-cargados:**
  * `20260001` (Sofía Ramírez Gómez - Curso 5A)
  * `20260002` (Mateo Alejandro Morales - Curso 5A)
  * `20260003` (Valentina Herrera Castro - Curso 5A)
  * `20260004` (Santiago David Vargas - Curso 5A)
  * `20260005` (Mariana Isabel Torres - Curso 5A)
  * ... hasta `20260100` (100 estudiantes precargados en grados 1 a 5).

### 3. Pantalla de Resultados en Vivo (Videobeam / Proyector)
* **Ruta:** `/resultados` (o mediante el botón **"Resultados en Vivo"** en la barra superior de la estación de votación)
* Transmisión en tiempo real vía Server-Sent Events (SSE), métricas de participación por curso, visualización del ganador proyectado y conmutador a pantalla completa.

---

## 🌟 Novedades y Últimas Actualizaciones

* **👥 Visualizador de Candidatos Oficiales (`CandidatesDisplay`):**
  * Muestra visual, elegante y reactiva de los candidatos oficiales a personería directamente en la pantalla de bienvenida / identificación de la estación de votación.
  * Consulta en tiempo real desde la base de datos: número de tarjetón, fotografía oficial, curso/grado, lema de campaña y ficha detallada de propuestas.
* **🛡️ Seguridad Perimetral por IP (Filtro / Whitelist de Red):**
  * Posibilidad de restringir las votaciones exclusivamente a las redes Wi-Fi autorizadas o computadores oficiales de la institución.
  * Configurable directamente desde la pestaña de **Configuración** en el panel administrativo, con detección automática de la IP pública actual.
  * Pantalla de bloqueo institucional (*Acceso Denegado*) con diseño amigable para terminales fuera de la red autorizada.
* **📊 Enlace a Proyección de Resultados en Vivo:**
  * Acceso directo e intuitivo desde la barra superior de la estación de votación para permitir que la comunidad educativa observe el escrutinio en tiempo real.
* **🌓 Selector de Modo Claro / Modo Oscuro:**
  * Conmutador de tema visual accesible en la estación de votación y en la pantalla de proyección de resultados.
  * Persistencia automática de la preferencia visual en el navegador (`localStorage`).
  * Alto contraste optimizado tanto para ambientes oscuros / proyectores como para pantallas en salones muy iluminados.
* **🔄 Resiliencia y Auto-Recuperación de Base de Datos:**
  * Detección proactiva de integridad y respaldo automático preventivo (`elections.sqlite.corrupt.<timestamp>`) que evita caídas del servidor ante apagados abruptos.

---

## 🔒 Arquitectura de Seguridad & Secreto de Voto

1. **Separación de Votante y Urna:**
   * La tabla `voter_status` marca qué estudiante ha votado para evitar el doble sufragio.
   * La tabla `votes` registra únicamente la opción elegida (`candidate_id` o `is_blank`) y la marca de tiempo, **sin ningún enlace o clave foránea al estudiante**.
2. **Tokens Efímeros de Un Solo Uso:**
   * Al identificarse, el estudiante recibe un token criptográfico válido por 120 segundos que se destruye inmediatamente tras depositar el voto.
3. **Firmas Digitales QR (HMAC-SHA256):**
   * Los carnets estudiantiles incorporan una firma generada con clave secreta del servidor para evitar falsificaciones o duplicaciones de carnets.
4. **Seguridad Perimetral:**
   * Validación de encabezados `x-forwarded-for` y direcciones IP de origen para estaciones de voto.
5. **Auditoría Inmutable:**
   * Registro cronológico de aperturas de mesa, cierres, inicios de sesión e importaciones de censos.

---

## 📊 Funcionalidades del Sistema

* **Estación Kiosk Táctil:**
  * Lector de código QR por cámara web integrada.
  * Teclado numérico táctil en pantalla para códigos manuales.
  * Visualización de fotos, slogans y tarjetón de candidatos.
  * Opción oficial de Voto en Blanco.
  * Modal de confirmación previa con bloqueo de doble clic.
  * Animación de celebración y reinicio automático en 6 segundos.
  * Selector de tema claro/oscuro y acceso rápido a resultados en vivo.
* **Panel de Control Administrativo:**
  * Dashboard de escrutinio en tiempo real con gráficas de participación.
  * Control de apertura y cierre de mesas.
  * Gestión completa de candidatos (fotos, slogans, listas).
  * Censo escolar con búsqueda, filtros por curso/grado y visualizador/impresor de carnets individuales y colectivos.
  * **Importador Masivo de Excel:** Detección de cabeceras, mapeo inteligente de columnas, validación previa de duplicados e inserción atómica.
  * **Reportes & Actas:**
    * Generación de **Acta Oficial de Escrutinio en PDF** con tablas estructuradas, porcentajes y campos de firma para jurados.
    * Exportación a **Excel Multi-Hoja** con consolidado y participación por curso.
  * **Personalización Institucional y Seguridad:** Cambio de nombre de colegio, logo, pie de página y control de restricción de IP.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** React 19, Tailwind CSS, Lucide Icons, jsPDF + AutoTable, Canvas Confetti, HTML5 QR Scanner.
* **Backend:** Node.js, Express, TypeScript (`tsx`), Server-Sent Events (SSE).
* **Criptografía:** `node:crypto` (HMAC-SHA256, timingSafeEqual, SHA-256 tokens).
* **Persistencia Dual (SQLite / MySQL):** Soporte nativo para SQLite en entorno local mediante motor WASM (`sql.js`) y MySQL 8+ en producción (`mysql2`).

---

## 📄 Guía de Migración a MySQL 8+

Consulta el documento en [`docs/sqlite-to-mysql.md`](./docs/sqlite-to-mysql.md) para el esquema DDL completo y los pasos de migración en producción.
