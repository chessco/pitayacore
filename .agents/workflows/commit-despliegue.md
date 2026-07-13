---
description: Realiza auditoría de seguridad, linters/pruebas, compilación, commit, push y despliegue automatizado.
---

# Workflow: Seguridad, Commit, Push y Despliegue

Este workflow guía al agente para confirmar, subir y desplegar cambios a producción de manera 100% segura tras pasar auditorías y pruebas de calidad.

## Pasos del Workflow

### 1. Auditoría de Seguridad (Security Audit)
- Analizar los archivos modificados en busca de credenciales, claves de API, llaves privadas o contraseñas en duro (ej. `GEMINI_API_KEY`, `JWT_SECRET`, etc.).
- Asegurar que ningún archivo que contenga credenciales locales (ej. `.env`, archivos en `scratch/` con credenciales reales) sea incluido en el commit.

### 2. Formateo y Linters (Integrity Check)
- Ejecutar linters y formateadores según el área modificada:
  - **API:** Ejecutar `npm run lint` en `/api` y corregir cualquier advertencia o error.
  - **Web:** Ejecutar `npm run lint` en `/web` y corregir cualquier error.

### 3. Suite de Pruebas Unitarias (Testing)
- Correr la suite de pruebas unitarias de los módulos modificados:
  - **API:** `npm run test` para asegurar que las pruebas de NestJS pasen exitosamente.
  - **Web:** `npm run test` para asegurar que las pruebas de Vitest pasen exitosamente.
- Si alguna prueba falla, abortar el flujo y proponer soluciones.

### 4. Compilación de Sanidad (Build check)
- Realizar una compilación de producción en local para validar que no haya errores de tipado de TypeScript o empaquetado:
  - **API:** `npm run build` en `/api`.
  - **Web:** `npm run build` en `/web`.

### 5. Commit y Push
- Crear un mensaje de commit descriptivo siguiendo el estándar de Conventional Commits (ej. `feat(design): added theme provider context`, `fix(api): resolved guard injection error`).
- Ejecutar `git add` y `git commit`.
- Subir los cambios a la rama remota correspondiente con `git push`.

### 6. Despliegue a Producción (Deployment)
- Identificar los submódulos modificados y proponer la ejecución de los scripts de despliegue automatizados correspondientes:
  - Si hay cambios en **API:** `.\scripts\deploy_api_hetzner.ps1`
  - Si hay cambios en **Web:** `.\scripts\deploy_web_hostinger.ps1`
- Informar el estado final del despliegue al usuario.
