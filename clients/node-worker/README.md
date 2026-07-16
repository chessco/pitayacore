# PitayaCore - Worker Client (Node.js)

Este es el cliente ligero diseñado para ejecutarse en las máquinas locales (como tu Lenovo T14) o en cualquier servidor. Su función es conectarse por WebSockets a **PitayaCore**, reportar latidos de disponibilidad, y ejecutar Scripts Node.js remotos para orquestación y automatización (como Puppeteer, Playwright, descargas SAT, etc.).

## 🚀 Requisitos Previos

- **Node.js** v18 o superior.
- Una conexión estable a internet para el WebSockets.

## ⚙️ Instalación

1. Clona o copia esta carpeta a la computadora destino (ej. Lenovo T14).
2. Instala las dependencias:
   ```bash
   npm install
   ```

## 🔑 Configuración

Copia el archivo `.env.example` a `.env` y rellénalo con los datos de tu plataforma:

```bash
cp .env.example .env
```

Edita el `.env`:
- `TENANT_ID`: El ID del tenant bajo el que operará el Worker (ej. `2bf7a176-a1e5-4310-9793-fbaf27bb2606`).
- `API_KEY`: La Master Flow API Key de tu entorno (ej. la que usas en el frontal).
- `WORKER_ID`: Un identificador único para esta máquina física (ej. `LenevoT14_01`). Este ID debe coincidir **exactamente** con el ID o Nombre del Worker que registres en el Dashboard Web de Operations.

## ▶️ Ejecución

Para iniciar el Worker, simplemente ejecuta:

```bash
node worker.js
```

Verás los logs de conexión. Desde ese momento, el Worker aparecerá `ONLINE` en PitayaCore y quedará escuchando para procesar los Scripts vinculados a Jobs que ordenes ejecutar.
