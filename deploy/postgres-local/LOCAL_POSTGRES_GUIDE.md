# Guía Rápida: PostgreSQL 17 Completo en Servidor Local + Suite de Pruebas

Esta carpeta contiene toda la estructura completa de base de datos PostgreSQL y los scripts automáticos para instalarla, poblarla con datos de prueba y validar todas las reglas de seguridad en tu servidor local o máquina virtual (Debian 13 / Ubuntu / Docker).

---

## Archivos Incluidos

- `01_schema_complete.sql`: Esquema completo PostgreSQL 17 (14 tablas, cifrado `pgcrypto`, RLS estricto por sesión, bloqueo anti-replay `TXID`, auditoría inmutable SHA-256, trigger de **límite máximo del 30% en retiros de clientes** y trigger de **autorización obligatoria por `trabajofino52@gmail.com`**).
- `02_seed_local_tests.sql`: Datos iniciales (Propietario `trabajofino52@gmail.com`, cuenta demo aislada `gokudemo`, 10 testers `tester01`..`tester10`, economía `70% / 30% / 20%` y tope `30%`).
- `setup-local-postgres.sh`: Instalador automático nativo para Debian 13 / Ubuntu.
- `docker-compose.postgres.yml`: Alternativa instantánea en contenedor Docker (puerto `127.0.0.1:5432`).
- `test-postgres-suite.sh`: Suite automática de 9 pruebas reales contra PostgreSQL (verifica contraseñas, RLS, bloqueo de retiro > 30%, autorización exclusiva del dueño y auditoría inmutable).

---

## Opción A: Instalación Nativa en Servidor Local Debian 13 / Ubuntu

```bash
chmod +x deploy/postgres-local/setup-local-postgres.sh deploy/postgres-local/test-postgres-suite.sh
sudo bash deploy/postgres-local/setup-local-postgres.sh
```

Ejecuta inmediatamente la suite de pruebas:

```bash
sudo bash deploy/postgres-local/test-postgres-suite.sh
```

Para conectarte manualmente con `psql` e inspeccionar las tablas:

```bash
sudo -u postgres psql -d aethervault_local
```

Comandos útiles dentro de `psql`:
```sql
\dt
SELECT email, role, coins_balance, is_active FROM users ORDER BY role, email;
SELECT id, player_email, amount_coins, max_allowed_30pct_coins, status, authorized_by_email FROM player_redemption_requests;
```

---

## Opción B: Levantar en 1 Comando con Docker

```bash
docker compose -f deploy/postgres-local/docker-compose.postgres.yml up -d
```

Luego valida con:

```bash
PGPASSWORD='Tripitaka@8069@9982@Profesor' bash deploy/postgres-local/test-postgres-suite.sh
```
