# Guía Completa: Instalación en Máquina Virtual (Debian 13) + Pruebas con 10 Usuarios + Subida a VPS

Esta guía paso a paso te permite **instalar hoy mismo todo en tu Máquina Virtual (VirtualBox / VMware / KVM con Debian 13)**, probar todos los juegos con **hasta 10 usuarios simultáneos** guardando cada experiencia/error en un log descargable, configurar tus cuentas **USDT / Bitcoin / PayPal Business / Tarjetas** dentro de la **Bóveda**, y migrar después a tu **VPS público**.

---

## 1. Requisitos de tu Máquina Virtual (VM Debian 13)

1. Crea una VM con **Debian 13 (Trixie)** (2 vCPU, 2–4 GB RAM, 20 GB disco).
2. En la configuración de red de VirtualBox/VMware elige **Adaptador Puente (Bridged)** para que la VM tenga una IP de tu red local (por ejemplo `192.168.1.50`) y tus **hasta 10 testers** en la misma red puedan entrar desde su navegador.
3. Si usas **NAT**, reenvía los puertos TCP `22`, `80`, `443` y `3000` hacia tu VM.

---

## 2. Pasos para Instalar y Arrancar en tu Máquina Virtual

Conéctate a tu VM Debian 13 por consola o SSH y ejecuta exactamente estos comandos:

```bash
# 1. Instalar git y unzip si no están presentes
sudo apt-get update && sudo apt-get install -y git curl

# 2. Copiar o entrar a la carpeta del proyecto
cd /ruta/a/tu/proyecto

# 3. Dar permisos de ejecución y lanzar el instalador en modo Virtual (--vm-test)
chmod +x deploy/debian13/install-debian13.sh
sudo bash deploy/debian13/install-debian13.sh --vm-test
```

### ¿Qué configura automáticamente el instalador?
- Instala **Node.js 22 LTS**, **PostgreSQL 17** (con Row-Level Security `RLS`, `SCRAM-SHA-256` y tabla `vm_experience_logs`), **Nginx**, **UFW** y **Fail2Ban**.
- Configura la cuenta de Propietario `trabajofino52@gmail.com` en SQL con su clave privada protegida mediante `scrypt`.
- Activa `VM_TEST_MODE=true` con **10 cuentas de prueba aisladas** (`tester01` hasta `tester10`, clave `vmtest2026`, cada una con `$5,000 USD` / `6,250 monedas` de prueba), además de `gokudemo` (`goku30309982`).
- Genera certificados **SSL/TLS locales autofirmados** para probar HTTPS en `https://<IP-DE-TU-VM>` (acepta la advertencia de certificado local en el navegador).
- Programa respaldos diarios cifrados en `/var/backups/aethervault/`.

---

## 3. Cómo Probar Hoy con tus 10 Usuarios y Guardar Todos los Fallos en el Log

1. **Entra como Administrador (`trabajofino52@gmail.com`)**:
   - Haz clic en el botón de sesión arriba a la derecha, selecciona **Dueño (Clave)** y escribe tu contraseña (la aplicación siempre te pedirá la clave y la validará en SQL).
   - Ve a **Bóveda del Dueño -> Bóveda: Cuentas USDT / BTC / PayPal** para guardar tus billeteras reales de **USDT (TRC-20 / ERC-20 / BEP-20)**, **Bitcoin (BTC)**, **PayPal Business**, cuenta bancaria y tu pasarela preferida para tarjetas.
2. **Reparte las 10 cuentas de prueba entre tus testers**:
   - Usuarios: `tester01`, `tester02`, ..., hasta `tester10` (o con `@vm.aethervault.local`).
   - Contraseña de los 10 testers: `vmtest2026`.
   - También disponen de `gokudemo` (`goku30309982`).
   - *Nota:* Las cuentas reales nuevas que no pertenecen al cupo de los 10 testers permanecen inactivas hasta confirmar depósito en USDT/tarjeta.
3. **Captura Automática de Experiencias, Pagos y Fallos**:
   - Cada jugada, apuesta, compra en tienda, error de JavaScript (`window.onerror` / `unhandledrejection`), fallo de React (`ErrorBoundary`) y ticket de soporte (`Soporte -> Reportar Bug`) se guarda en tiempo real en `vm_experience_logs`.
   - Para revisar o enviarme todo lo ocurrido: entra en **Bóveda del Dueño -> Logs QA & 10 Testers VM** y presiona **`Descargar Reporte (.json)`**.

---

## 4. Subir a Producción en tu VPS Público (Cuando Todo Funcione al 100%)

1. Apunta tu dominio (`A` record DNS) a la IP pública de tu VPS Debian 13.
2. Ejecuta en el VPS:

```bash
sudo bash deploy/debian13/install-debian13.sh --vps-prod tu-dominio.com
```

3. Verifica que todo esté operativo:

```bash
sudo systemctl status aethervault
sudo ufw status verbose
sudo fail2ban-client status
curl -I https://tu-dominio.com/api/health
```
