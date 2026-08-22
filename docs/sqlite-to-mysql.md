# Guía de Migración: SQLite ➔ MySQL 8+

Esta aplicación fue construida desde el inicio con una **Capa de Abstracción de Base de Datos (DAL / Repository Pattern)**. Esto permite cambiar el motor de base de datos de **SQLite** a **MySQL 8+** sin modificar los componentes de React, los controladores ni los servicios de negocio.

---

## 1. Requisitos Previos en el Servidor MySQL

1. Servidor **MySQL 8.0 o superior** (o MariaDB 10.5+).
2. Base de datos creada con codificación `utf8mb4`:

```sql
CREATE DATABASE elections_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Usuario con permisos sobre la base de datos:

```sql
CREATE USER 'elec_user'@'%' IDENTIFIED BY 'TuPasswordSeguro2026!';
GRANT ALL PRIVILEGES ON elections_school.* TO 'elec_user'@'%';
FLUSH PRIVILEGES;
```

---

## 2. Variables de Entorno en Producción

El sistema detectará automáticamente si debe conectarse a MySQL o usar el fallback de SQLite, dependiendo de las siguientes variables.

En el archivo `.env` del servidor de producción (o en el Panel de Variables de Entorno de Hostinger), debes usar la configuración individual de variables para evitar problemas con contraseñas que contienen caracteres especiales:

```env
# Configuración Nueva (MySQL 8+):
DATABASE_CLIENT=mysql
DB_HOST=127.0.0.1
DB_USER=elec_user
DB_PASSWORD=TuPasswordSeguro2026!
DB_NAME=elections_school
DB_PORT=3306
```

> **NOTA IMPORTANTE PARA HOSTINGER:**
> *   No uses `DATABASE_URL` si tu contraseña tiene caracteres especiales (como `@`, `#`, etc.), ya que romperá el parseo de la URL y te devolverá el error `TypeError: Invalid URL`. Usa siempre el bloque de variables separadas (`DB_HOST`, `DB_USER`, etc.).
> *   Si encuentras el error `Access denied for user 'xxx'@'::1'`, **asegúrate de cambiar `DB_HOST=localhost` por `DB_HOST=127.0.0.1`**. Los servidores compartidos suelen forzar las conexiones IPv6 en `localhost` y fallan los permisos locales.

## 3. Esquema DDL para MySQL 8+

Ejecutar el siguiente script SQL en el servidor MySQL para crear las tablas con las mismas restricciones e índices:

```sql
-- 1. Tabla de Usuarios Administradores
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(30) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

-- 2. Tabla de Procesos Electorales
CREATE TABLE IF NOT EXISTS elections (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  year INT NOT NULL,
  description TEXT,
  start_at VARCHAR(30),
  end_at VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  allow_blank_vote TINYINT(1) NOT NULL DEFAULT 1,
  show_live_results TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

-- 3. Tabla de Candidatos
CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR(36) PRIMARY KEY,
  election_id VARCHAR(36) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  student_course VARCHAR(50) NOT NULL,
  list_number INT NOT NULL,
  slogan VARCHAR(255),
  description TEXT,
  photo_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Tabla de Estudiantes (Censo Escolar)
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(36) PRIMARY KEY,
  student_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  course VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at VARCHAR(30) NOT NULL,
  updated_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

-- 5. Control de Participación (Prevención de Doble Voto)
CREATE TABLE IF NOT EXISTS voter_status (
  id VARCHAR(36) PRIMARY KEY,
  election_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  has_voted TINYINT(1) NOT NULL DEFAULT 1,
  voted_at VARCHAR(30) NOT NULL,
  station_id VARCHAR(50),
  UNIQUE KEY uq_election_student (election_id, student_id),
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Urna Electrónica Anónima (Secreto del Voto)
-- IMPORTANTE: Esta tabla NUNCA almacena student_id
CREATE TABLE IF NOT EXISTS votes (
  id VARCHAR(36) PRIMARY KEY,
  election_id VARCHAR(36) NOT NULL,
  candidate_id VARCHAR(36) NULL,
  is_blank TINYINT(1) NOT NULL DEFAULT 0,
  created_at VARCHAR(30) NOT NULL,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Tokens Temporales de Votación
CREATE TABLE IF NOT EXISTS voting_tokens (
  token_hash VARCHAR(64) PRIMARY KEY,
  election_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  expires_at VARCHAR(30) NOT NULL,
  is_consumed TINYINT(1) NOT NULL DEFAULT 0,
  created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

-- 8. Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  username VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

-- 9. Ajustes Institucionales
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(36) PRIMARY KEY,
  school_name VARCHAR(150) NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(20) NOT NULL DEFAULT '#1e3a8a',
  secondary_color VARCHAR(20) NOT NULL DEFAULT '#0284c7',
  footer_text VARCHAR(255) NOT NULL,
  allow_qr_scanner TINYINT(1) NOT NULL DEFAULT 1,
  allow_manual_id TINYINT(1) NOT NULL DEFAULT 1,
  updated_at VARCHAR(30) NOT NULL
) ENGINE=InnoDB;
```

---

## 4. Migración de Datos Existentes (SQLite ➔ MySQL)

Para trasladar los datos existentes en `data/elections.sqlite` hacia MySQL:

```bash
# Paso A: Exportar dump desde SQLite
sqlite3 data/elections.sqlite .dump > backup_sqlite.sql

# Paso B: Importar en MySQL (revisando sintaxis de comillas dobles si aplica)
mysql -u elec_user -p elections_school < backup_mysql.sql
```

---

## 5. Verificación de Integridad

Comprobar que el total de registros coincida:

```sql
SELECT 'Estudiantes' as tabla, COUNT(*) as total FROM students
UNION ALL
SELECT 'Candidatos', COUNT(*) FROM candidates
UNION ALL
SELECT 'Votos Emitidos', COUNT(*) FROM votes
UNION ALL
SELECT 'Votantes Marcados', COUNT(*) FROM voter_status;
```
