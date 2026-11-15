# Guía de Seguridad e Instalación en Producción — Debian 13 (Trixie)

Esta guía resume la arquitectura de seguridad implementada tanto en la **Aplicación** como en la **Base de Datos**, junto con los pasos exactos para instalar y proteger todo hoy mismo en tu servidor **Debian 13**.

---

## 1. Capas de Seguridad Implementadas en la App & Base de Datos

### Seguridad en la Aplicación (`server.ts`, `server/security.ts`, `server/cryptoVault.ts`)
- **Tokens de Sesión Firmados (`HMAC-SHA256`) + Cookies `HttpOnly`:** Todas las rutas administrativas y de soporte validan firmas criptográficas en cada solicitud.
- **Hashing de Contraseñas con `scrypt` + Salt Aleatorio de 128-bit:** Resistente a ataques por diccionario y GPU/ASIC, con comparación en tiempo constante (`crypto.timingSafeEqual`) para evitar ataques de temporización.
- **Rate Limiter por IP + Bloqueo Anti-Brute-Force:** Ventana deslizante estricta para `/api/auth/login` y `/api/auth/change-password`. Tras **5 intentos fallidos**, la cuenta queda bloqueada automáticamente durante **15 minutos** y queda registrado como evento `CRITICAL`.
- **Sanitización Anti-Prototype-Pollution & XSS:** Limpieza recursiva de llaves peligrosas (`__proto__`, `constructor`, `prototype`), límite de carga útil JSON (`100kb`) y cabeceras HTTP de endurecimiento (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`).
- **Tablero de Auditoría en Vivo (`Seguridad App & BD` en Panel Admin):** Exclusivo para `trabajofino52@gmail.com` con verificación de integridad criptográfica en 1 clic.

### Seguridad en la Base de Datos (`server/db.ts` + `deploy/debian13/postgres-hardening.sql`)
- **Cifrado en Reposo de Campos Sensibles (`AES-256-GCM`):** Hashes de pago TXID y destinos sensibles se cifran con IV aleatorio de 96 bits y etiqueta de autenticación GCM antes de guardarse en disco.
- **Consultas 100% Parametrizadas:** Protección total contra Inyección SQL (`SQLi`).
- **Auditoría Inmutable Encadenada (`SHA-256`):** Cada entrada en `security_audit_logs` contiene el hash del registro anterior (`prev_hash` → `row_hash`). Cualquier modificación manual en la BD rompe la cadena y es detectada al instante.
- **Modo SQLite WAL Endurecido (`PRAGMA secure_delete = ON`, permisos `0600`) + Esquema PostgreSQL 17 con RLS:** Incluye Row-Level Security (RLS), rol sin privilegios (`aethervault_app` con `NOSUPERUSER`), autenticación `SCRAM-SHA-256` y trigger append-only que impide `UPDATE` o `DELETE` en los logs de auditoría.

---

## 2. Instalación Automática Hoy en Debian 13 (Trixie)

Copia el proyecto a tu servidor Debian 13 (por ejemplo vía `git clone` o `scp`) y ejecuta el instalador automatizado:

```bash
cd /ruta/al/proyecto
chmod +x deploy/debian13/install-debian13.sh
sudo bash deploy/debian13/install-debian13.sh
```

### ¿Qué configura automáticamente este script?
1. Instala **Node.js 22 LTS**, **PostgreSQL 17**, **Nginx**, **Certbot**, **UFW** y **Fail2Ban**.
2. Crea el usuario del sistema aislado `aethervault` (`/usr/sbin/nologin`).
3. Endurece PostgreSQL (`listen_addresses = 'localhost'`, `scram-sha-256`, `ssl = on`) y aplica `deploy/debian13/postgres-hardening.sql`.
4. Genera automáticamente claves criptográficas aleatorias de 256 bits (`DB_ENCRYPTION_KEY`, `SESSION_SECRET`) en `/opt/aethervault/.env` con permisos estrictos `chmod 600`.
5. Configura el servicio `systemd` con sandbox estricto (`NoNewPrivileges=yes`, `ProtectSystem=strict`, `PrivateTmp=yes`).
6. Activa el Firewall **UFW** (solo puertos `22`, `80` y `443`) y las cárceles de **Fail2Ban** para SSH y límite de peticiones en Nginx.

---

## 3. Activar HTTPS (Certificado SSL Let's Encrypt) y Verificar

Una vez apuntado tu dominio al IP del servidor Debian 13:

```bash
# 1. Editar server_name en Nginx con tu dominio real
sudo nano /etc/nginx/sites-available/aethervault.conf

# 2. Emitir certificado SSL/TLS automático
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# 3. Cambiar OWNER_MASTER_KEY en .env por una clave privada única (opcional recomendado)
sudo nano /opt/aethervault/.env
sudo systemctl restart aethervault
```

### Comandos rápidos de verificación en Debian 13
```bash
# Salud del backend y API
curl -s http://127.0.0.1:3000/api/health

# Estado del servicio systemd
sudo systemctl status aethervault

# Estado de PostgreSQL y Firewall
sudo systemctl status postgresql
sudo ufw status verbose
sudo fail2ban-client status
```
