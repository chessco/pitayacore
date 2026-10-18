# GitHub Actions Secrets & Configuration Guide — PitayaCore

Esta guía documenta los secretos y variables de entorno requeridos en GitHub Actions para el despliegue automático de **PitayaCore** cuidando la seguridad y confidencialidad.

---

## 🔐 Configuración en GitHub

Ve a tu repositorio en GitHub:
**Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**

### 1. Despliegue API & Backend (Hetzner)
Usado por el flujo `.github/workflows/deploy-api-hetzner.yml`.

| Nombre del Secreto | Descripción | Ejemplo / Valor |
|---|---|---|
| `HETZNER_HOST` | Dirección IP o dominio del servidor de Hetzner | `46.224.155.43` |
| `HETZNER_USER` | Usuario con permisos SSH y Docker | `root` |
| `HETZNER_SSH_KEY` | Clave privada SSH (contenido completo de `~/.ssh/id_citaia`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `HETZNER_PORT` | Puerto SSH (opcional, por defecto `22`) | `22` |

> [!NOTE]
> En el servidor Hetzner, el archivo `/opt/pitaya/pitayacore/api/.env.prod` se mantiene de forma segura y nunca se sube al repositorio Git. El workflow copia este archivo localmente en el contenedor durante el despliegue.

---

### 2. Despliegue Web Frontend (Hostinger)
Usado por el flujo `.github/workflows/deploy-web-hostinger.yml`.

| Nombre del Secreto | Descripción | Ejemplo / Valor |
|---|---|---|
| `HOSTINGER_HOST` | Dirección IP o host SSH de Hostinger | `185.212.71.206` |
| `HOSTINGER_USER` | Usuario SSH de Hostinger | `u471794305` |
| `HOSTINGER_SSH_KEY` | Clave privada SSH autorizada en Hostinger | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `HOSTINGER_PORT` | Puerto SSH de Hostinger (por defecto `65002`) | `65002` |
| `HOSTINGER_PATH` | Ruta absoluta o relativa en Hostinger | `domains/pitayacore.pitayacode.io/public_html` |
| `VITE_API_URL` | URL de la API de producción para Vite | `https://pitayacore-api.pitayacode.io` |

---

## 🛡️ Políticas de Seguridad Aplicadas ("Cuidando Secretos")

1. **Cero Secretos en el Repositorio Git:**
   - `.gitignore` ignora todos los archivos `.env`, `.env.*`, backups y volcados de base de datos (`.sql`, `.dump`).
   - Se crearon plantillas limpias `.env.example` en `api/`, `web/` y `api/mcp-pitayacore/` sin credenciales sensibles.
   - Cualquier archivo `.env` que haya sido indexado por error fue desasociado del historial de Git (`git rm --cached`).

2. **Aislamiento en Runners de GitHub:**
   - Las claves SSH se transfieren exclusivamente por variables de entorno protegidas (`umask 077` y permisos `600`).
   - El paso de limpieza se ejecuta con `if: always()` garantizando que los archivos de credenciales temporales se destruyan incluso si el despliegue falla.
   - No se imprimen secretos en logs de consola ni trazas de Docker.
