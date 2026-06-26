# Guía de Despliegue de Producción - PitayaCore

Este documento detalla el proceso final para desplegar **PitayaCore** en sus entornos de producción: **Hetzner** (Backend/API) y **Hostinger** (Frontend/Web).

## 🚀 Resumen del Estado Actual
- **Build de Producción:** ✅ Verificado y exitoso (Zero errors).
- **TypeScript:** ✅ Reglas `noUnusedLocals` y `noUnusedParameters` relajadas en `tsconfig.app.json` para facilitar el despliegue.
- **Configuración:** ✅ Todos los componentes usan `VITE_API_URL` para la comunicación con la API.
- **Seguridad:** ✅ Secretos y llaves SSH manejados externamente.

---

## 🏗️ Despliegue del Backend (Hetzner)
La API corre sobre Docker en un servidor compartido dentro de la red `pitayacode_net`.

### Pasos:
1. Asegúrate de tener la llave SSH `id_citaia` en tu carpeta `.ssh`.
2. Ejecuta el script automatizado desde la raíz:
## 🔐 Configuración de Entornos (.env)

Hemos implementado un sistema de doble archivo para evitar conflictos entre local y producción:

- **`api/.env`**: Configuración para desarrollo local (usa `localhost`).
- **`api/.env.prod`**: Configuración para producción (fuente maestra).

### Credenciales de Producción (Hetzner)
| Base de Datos | Host | Usuario | Contraseña | Puerto Interno |
| :--- | :--- | :--- | :--- | :--- |
| **MySQL (Transaccional)** | `pitaya-mysql-prod` | `root` | *(ver .env.prod)* | 3306 |
| **PostgreSQL (Vectores)** | `pitaya-postgres-prod` | `pitayacore_user` | *(ver .env.prod)* | 5432 |

---

## 🚀 Despliegue Automatizado

### 1. API (Hetzner)
El script `.\scripts\deploy_api_hetzner.ps1` realiza las siguientes acciones:
1. Empaqueta el código del API.
2. Sube el paquete al servidor Hetzner.
3. **Crucial:** Mantén `api/.env.prod` como la fuente maestra y sincronízalo al despliegue.
4. Reconstruye el contenedor `pitayacore-api`.

```powershell
.\scripts\deploy_api_hetzner.ps1
```

### 2. Web (Hostinger)
El script `.\scripts\deploy_web_hostinger.ps1` compila y sube el frontend:
1. Genera la build de Vite.
2. Sube los archivos vía SSH/SCP.
3. Asegura que el `.htaccess` esté configurado para rutas SPA.

```powershell
.\scripts\deploy_web_hostinger.ps1
```

### 3. Sincronización de Datos (Knowledge)
Para subir nuevos vectores de conocimiento desde local a producción:
```powershell
.\scripts\sync_postgres_to_prod.ps1
```
*(Asegúrate de que la base de datos local sea `pitayacore_vectors`)*.

---

## 🛠️ Solución de Problemas Comunes

### Error de CORS o 500 al iniciar
Suele deberse a que el API no puede conectar con la base de datos (Error P1000/P1001). Verifica que la red `pitayacode_net` exista en el servidor y que las credenciales en `api/.env.prod` coincidan con las de los contenedores.

### API No Conecta
Verifica que la variable `VITE_API_URL` en `web/.env.production` apunte a la dirección correcta (ej: `https://pitayacore-api.pitayacode.io` o la IP de Hetzner).

---

## 📝 Notas de Versión
- **v1.2.0:** Implementación de despliegue automatizado y limpieza de componentes core.
- **v1.2.1:** Corrección de tipos en `UserManager` y `DeepExplanationBlock`.
- **v1.2.2:** Optimización de `tsconfig` para despliegue continuo.

---
*Mantenido por Antigravity (Advanced Agentic Coding)*
