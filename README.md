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
* **Ruta:** `/resultados`
* Transmisión en tiempo real vía Server-Sent Events (SSE), métricas de participación por curso y conmutador a pantalla completa.

---

## 🔒 Arquitectura de Seguridad & Secreto de Voto

1. **Separación de Votante y Urna:**
   * La tabla `voter_status` marca qué estudiante ha votado para evitar el doble sufragio.
   * La tabla `votes` registra únicamente la opción elegida (`candidate_id` o `is_blank`) y la marca de tiempo, **sin ningún enlace o clave foránea al estudiante**.
2. **Tokens Efímeros de Un Solo Uso:**
   * Al identificarse, el estudiante recibe un token criptográfico válido por 120 segundos que se destruye inmediatamente tras depositar el voto.
3. **Firmas Digitales QR (HMAC-SHA256):**
   * Los carnets estudiantiles incorporan una firma generada con clave secreta del servidor para evitar falsificaciones o duplicaciones de carnets.
4. **Auditoría Inmutable:**
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
* **Panel de Control Administrativo:**
  * Dashboard de escrutinio en tiempo real.
  * Control de apertura y cierre de mesas.
  * Gestión completa de candidatos (fotos, slogans, listas).
  * Censo escolar con búsqueda, filtros por curso/grado y visualizador/impresor de carnets individuales.
  * **Importador Masivo de Excel:** Detección de cabeceras, mapeo inteligente de columnas, validación previa de duplicados e inserción atómica.
  * **Reportes & Actas:**
    * Generación de **Acta Oficial de Escrutinio en PDF** con tablas estructuradas, porcentajes y campos de firma para jurados.
    * Exportación a **Excel Multi-Hoja** con consolidado y participación por curso.
  * **Personalización Institucional:** Cambio de nombre de colegio, logo y colores.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** React 19, Tailwind CSS, Lucide Icons, jsPDF + AutoTable, Canvas Confetti, HTML5 QR Scanner.
* **Backend:** Node.js, Express, TypeScript (`tsx`), Server-Sent Events (SSE).
* **Criptografía:** `node:crypto` (HMAC-SHA256, timingSafeEqual, SHA-256 tokens).
* **Persistencia:** SQLite modular mediante motor WASM (`sql.js`) con almacenamiento en `/data/elections.sqlite` y guía de migración transparente a MySQL 8+.

---

## 📄 Guía de Migración a MySQL 8+

Consulta el documento en [`docs/sqlite-to-mysql.md`](./docs/sqlite-to-mysql.md) para el esquema DDL completo y los pasos de migración en producción.
