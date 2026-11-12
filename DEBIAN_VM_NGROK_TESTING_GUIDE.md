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

### Paso 5: Ejecutar la Aplicación y Abrir el Túnel Ngrok

Puedes probarlo inmediatamente en dos terminales o con `screen`/`tmux`:

#### Terminal 1: Iniciar el Servidor de la Aplicación
```bash
cd /var/www/aethervault
npm run preview -- --host 0.0.0.0 --port 3000
# O si estás en modo desarrollo:
# npm run dev -- --host 0.0.0.0 --port 3000
```

#### Terminal 2: Iniciar el Túnel Ngrok
```bash
ngrok http 3000
```

Ngrok te mostrará en pantalla una URL pública segura como:
```text
Forwarding   https://a1b2-c3d4.ngrok-free.app -> http://localhost:3000
```

¡Listo! Ya puedes abrir esa URL `https://....ngrok-free.app` desde tu teléfono, laptop u otra PC en cualquier red para probar el juego completo.

---

## 🔄 Ejecución Permanente en Segundo Plano con Systemd + PM2

Si quieres que el juego y Ngrok sigan corriendo aunque cierres la terminal de la VM:

### 1. Instalar PM2 (Gestor de Procesos)
```bash
sudo npm install -g pm2
```

### 2. Iniciar el juego con PM2
```bash
cd /var/www/aethervault
pm2 start npm --name "aethervault-game" -- run preview -- --host 0.0.0.0 --port 3000
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

## 🛡️ Credenciales y Datos Clave para las Pruebas

- **Usuario Administrador / Dueño**: `trabajofino52@gmail.com`
- **Clave Maestra de Acceso E2EE (256-bit)**: `GokuCheckersMasterKey2024Secure`
- **Tasa Oficial de Cambio**: 1,000 monedas = $800.00 USD ($0.80 USD / moneda)
- **Módulos Exclusivos del Dueño**:
  - 👑 **Bóveda Dueño**: Regalos masivos por grupos/sección de juego, configuración de Hora Loca con multiplicadores en vivo, telemetría de jugadores online/offline.
  - 🏛️ **Neobanco & Pasarelas**: Las 10 plataformas recomendadas (Stripe, Adyen, BVNK, CoinPayments, etc.) y la arquitectura del banco digital.
