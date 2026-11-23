# 🐧 Guía Completa de Pruebas en PC Virtual (Debian 12 / 13) con Ngrok

Esta guía está diseñada exclusivamente para que puedas probar todo el sistema de **AetherVault (Juego de Damas + Casino Top 50 + Bóveda + Neobanco)** en tu propia máquina virtual (VirtualBox, VMware, Proxmox o Hyper-V) corriendo **Debian 12 (Bookworm)** o **Debian 13 (Trixie)**, exponiéndolo a internet de forma instantánea y segura con **Ngrok** sin necesidad de abrir puertos en tu router ni configurar dominios DNS públicos.

---

## 📋 Resumen del Entorno de Pruebas

| Parámetro | Valor Recomendado |
|---|---|
| **Sistema Operativo** | Debian GNU/Linux 12 / 13 (64-bit) en VM |
| **Recursos VM** | 2 vCPU, 2 GB a 4 GB RAM, 20 GB Disco |
| **Red de la VM** | Adaptador Puente (Bridged) o NAT |
| **Entorno Node.js** | Node.js v20.x o v22.x LTS + npm |
| **Túnel Seguro** | Ngrok (HTTPS gratuito con certificado SSL) |
| **Puerto Local** | `3000` |

---

## 🚀 Paso a Paso: Instalación en la Máquina Virtual

### Paso 1: Actualizar Debian e Instalar Paquetes Base
Abre la terminal de tu máquina virtual Debian como `root` o con `sudo`:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw ca-certificates gnupg
```

---

### Paso 2: Instalar Node.js 20 LTS (NodeSource)

```bash
# Descargar e instalar repositorio oficial NodeSource Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js y verificar versiones
sudo apt install -y nodejs
node -v    # Debe mostrar v20.x.x
npm -v     # Debe mostrar 10.x.x
```

---

### Paso 3: Clonar o Copiar el Proyecto en la VM

Ubica la carpeta del proyecto en `/var/www/aethervault` o en tu carpeta de usuario:

```bash
sudo mkdir -p /var/www/aethervault
sudo chown -R $USER:$USER /var/www/aethervault
cd /var/www/aethervault

# Copia los archivos de tu proyecto aquí o clónalo mediante git:
# git clone <tu-repositorio> .
```

Instala las dependencias y compila la aplicación para producción:

```bash
cd /var/www/aethervault
npm install
npm run build
```

---

### Paso 4: Instalar y Configurar Ngrok en Debian

Ngrok crea un túnel cifrado TLS/HTTPS desde tu máquina virtual hacia internet con una URL pública gratuita.

```bash
# 1. Agregar clave GPG y repositorio oficial de Ngrok
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null

echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list

# 2. Instalar Ngrok
sudo apt update
sudo apt install -y ngrok

# 3. Vincular tu Authtoken gratuito de Ngrok (obtenlo en dashboard.ngrok.com)
ngrok config add-authtoken TU_AUTHTOKEN_AQUI
```

---

### Paso 5: Configurar Variables de Entorno (.env) y Ejecutar el Servidor Full-Stack + Ngrok

> ⚠️ **Importante**: Esta aplicación incluye backend Express (`/api/*`), base de datos SQLite y webhooks de BTCPay Server dentro de `server.ts`. No uses `vite preview` porque no levanta la API del backend; ejecuta siempre el servidor unificado en el puerto `3000`.

Crea el archivo `.env` en la raíz del proyecto (puedes partir de `.env.example`):

```bash
cp .env.example .env
# Edita .env si deseas definir tus llaves o usa tu clave de pruebas local
```

Puedes iniciar el servidor completo y Ngrok en dos terminales:

#### Terminal 1: Iniciar el Servidor Full-Stack (Frontend + Backend API `/api/*` en puerto 3000)
```bash
cd /var/www/aethervault
# Opción A (Producción recomendada tras npm run build en Node 20/22+):
npx tsx server.ts
# (O en desarrollo directo: npm run dev)
```

#### Terminal 2: Iniciar el Túnel Ngrok
```bash
ngrok http 3000
```

Ngrok te mostrará en pantalla una URL pública segura como:
```text
Forwarding   https://a1b2-c3d4.ngrok-free.app -> http://localhost:3000
```

¡Listo! Ya puedes abrir esa URL `https://....ngrok-free.app` desde tu teléfono, laptop u otra PC en cualquier red para probar el juego completo, el panel `VaultConfigPanel`, los webhooks BTCPay (`https://....ngrok-free.app/api/webhooks/btcpay`) y el `AuditTrail`.

> 🔐 **Si usas Google Sign-In / Firestore desde la URL de Ngrok**: agrega el host `xxxx.ngrok-free.app` en Firebase Console → *Authentication → Settings → Authorized domains*.

---

## 🔄 Ejecución Permanente en Segundo Plano con Systemd + PM2

Si quieres que el juego y Ngrok sigan corriendo aunque cierres la terminal de la VM:

### 1. Instalar PM2 (Gestor de Procesos)
```bash
sudo npm install -g pm2
```

### 2. Iniciar el servidor unificado con PM2
```bash
cd /var/www/aethervault
pm2 start "npx tsx server.ts" --name "aethervault-server"
```

### 3. Iniciar Ngrok con PM2 o en segundo plano
```bash
pm2 start "ngrok http 3000 --log=stdout" --name "ngrok-tunnel"
pm2 save
pm2 startup
```

Para ver la URL activa de Ngrok en cualquier momento:
```bash
curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[^"]*ngrok-free.app'
```

---

## 💳 Paso 6: Conectar PayPal REST API Oficial y Webhooks con Ngrok

1. Ingresa al **PayPal Developer Dashboard** (`developer.paypal.com`), abre **Apps & Credentials** y selecciona **Sandbox** (para pruebas sin dinero real) o **Live** (producción).
2. Crea o abre tu aplicación PayPal Business y copia tu **Client ID** y **Secret**.
3. Inicia sesión en AetherVault como propietario (`trabajofino52@gmail.com` / clave `Tripitaka@8069@9982@Profesor`) y abre:
   **Bóveda Dueño → VaultConfigPanel: APIs & Retiros → Tarjeta PayPal REST API Oficial**.
   - Elige entorno `sandbox` o `live`, pega el `Client ID`, `Client Secret` y tu correo comerciante PayPal, y haz clic en **Guardar Bóveda Cifrada**.
   - Pulsa **Probar OAuth PayPal** para verificar en vivo el token OAuth2 oficial contra PayPal.
4. Para recibir confirmaciones automáticas de pago por túnel Ngrok:
   - En **PayPal Developer → Webhooks → Add Webhook**, registra tu URL pública:
     ```text
     https://TU-SUBDOMINIO.ngrok-free.app/api/webhooks/paypal
     ```
   - Suscríbete a los eventos: `PAYMENT.CAPTURE.COMPLETED` y `CHECKOUT.ORDER.APPROVED`.
   - Copia el **Webhook ID** generado por PayPal, pégalo en el campo `Webhook ID` dentro de `VaultConfigPanel` y guarda nuevamente (las credenciales se guardan cifradas con AES-256-GCM en SQLite).

---

## 🎮 Paso 7: Prueba Multijugador Completa (Juegos, Transferencias P2P y Retiros PayPal / USDT)

1. **Abre la URL pública de Ngrok** (`https://TU-SUBDOMINIO.ngrok-free.app`) en distintos navegadores o dispositivos (PC, teléfono, ventana incógnito).
2. **Inicia sesión con distintos jugadores VM**:
   - Dispositivo A: `tester01@vm.aethervault.local` (clave `vmtest2026`).
   - Dispositivo B: `tester02@vm.aethervault.local` (clave `vmtest2026`).
   - *(Disponibles de `tester01` hasta `tester10` con saldo real en SQLite sincronizado entre dispositivos)*.
3. **Prueba cada juego con múltiples jugadores**:
   - Juega **Ruleta Europea**, **Blackjack 21**, **Póker Video**, **Arena** y los juegos del **Top 50 Casino**.
   - La plataforma aplica la retención de la casa (`70%` bóveda / `30%` premios por defecto, configurable en **Economía 70% Bóveda / 30% Premios**) y sincroniza cada apuesta/premio en la base de datos.
4. **Transferencia entre jugadores y Conversión de Monedas**:
   - Pulsa **Transferir / Cambio** en la barra superior o en el dock inferior.
   - Envía monedas desde `tester01` hacia `tester02`: el servidor deduce automáticamente la **Comisión P2P del casino (5%)** a favor de la bóveda y acredita el neto al destinatario de forma atómica.
   - Usa la pestaña **Cambio & Retiro PayPal/USDT** para convertir entre Monedas Aether, USD y USDT (`1,000 mo = $800 USD`) y verificar tu tope máximo retirable del **30%**.
5. **Retiro a PayPal o USDT con Autorización del Dueño**:
   - Desde **Transferir / Cambio → Solicitar Retiro a PayPal o USDT**, ingresa un monto (limitado al 30% del saldo), elige `PayPal Business` o `USDT (TRC-20)` y escribe el correo PayPal o billetera TRC-20.
   - Entra como propietario (`trabajofino52@gmail.com`) a **Bóveda Dueño → Autorización de Canjes**, verifica la solicitud en **Espera de Autorización** (con la comisión del 20% deducida para el casino) y pulsa **Autorizar**:
     - Si el método es **PayPal** y configuraste tus llaves REST API, el servidor enviará automáticamente la orden a **PayPal Payouts v1** (`/v1/payments/payouts`) registrando el `Batch ID` y `payoutStatus`.
     - Todo movimiento queda registrado en tiempo real en la pestaña **AuditTrail (Auditoría Integral)**.

---

## 🛡️ Credenciales y Datos Clave para las Pruebas

- **Usuario Administrador / Dueño**: `trabajofino52@gmail.com`
- **Clave Maestra de Acceso E2EE (256-bit)**: `Tripitaka@8069@9982@Profesor`
- **Tasa Oficial de Cambio**: 1,000 monedas = $800.00 USD ($0.80 USD / moneda)
- **Reglas de Negocio Activas en Servidor**: `70%` Retención Casa · `20%` Comisión Retiro · `5%` Comisión P2P · Tope `30%` Retiro Máximo · `Espera de Autorización` manual obligatoria.
- **Módulos Exclusivos del Dueño**:
  - 👑 **Bóveda Dueño**: Configuración de APIs cifradas (`VaultConfigPanel`), autorización de canjes, márgenes dinámicos, airdrops, telemetría y `AuditTrail`.
  - 🏛️ **Neobanco & Pasarelas**: Las 10 plataformas recomendadas y arquitectura del banco digital.

