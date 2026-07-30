---
description: Auditoría de seguridad, lint/pruebas, build, commit, push y despliegue automatizado a producción.
argument-hint: "[mensaje de commit opcional]"
---

# Workflow: Seguridad → Commit → Push → Despliegue

Guía para confirmar, subir y desplegar cambios a producción de forma segura tras pasar auditorías y pruebas de calidad. Sigue los pasos EN ORDEN y **aborta** ante cualquier fallo, explicando el problema.

Mensaje de commit sugerido por el usuario (si lo dio): `$ARGUMENTS`

## 1. Auditoría de Seguridad (obligatoria — nunca omitir)
- Revisa los archivos modificados (`git diff`) en busca de credenciales, API keys, llaves privadas o contraseñas en duro (`GEMINI_API_KEY`, `JWT_SECRET`, `INTERNAL_API_KEY`, DB URLs, tokens `sk-`/`ghp_`/`AKIA…`, PEM, etc.).
- Verifica que ningún archivo con credenciales locales (`.env`, archivos de `scratch/` con secretos reales) quede staged.
- Confirma que los `.env` sigan gitignored.
- El hook `PreToolUse` de secretos (`.claude/hooks/secret-scan.py`) es la red de seguridad automática, pero haz esta revisión manual igual. Si aparece un secreto, **detente** y repórtalo.

## 2. Lint / Formateo (según área modificada)
- **API** (si cambió algo en `/api`): `cd api && npm run lint`
- **Web** (si cambió algo en `/web`): `cd web && npm run lint`
- Corrige advertencias/errores antes de continuar.

## 3. Pruebas Unitarias (según área modificada)
- **API**: `cd api && npm run test`
- **Web**: `cd web && npm run test` — nota: la infra de tests de la web (vitest) puede no estar instalada; si el comando no existe, indícalo y continúa (no lo trates como fallo).
- Si una prueba real falla, **aborta** y propón soluciones.

## 4. Build de Sanidad (validar tipado/empaquetado)
- **API**: `cd api && npm run build`
- **Web**: `cd web && npm run build` (corre `tsc -b && vite build`)
- Cualquier error de TypeScript o empaquetado detiene el flujo.

## 5. Commit y Push
- Crea un mensaje siguiendo Conventional Commits (`feat(...)`, `fix(...)`, `chore(...)`). Usa el mensaje del usuario si lo dio arriba; si no, redáctalo a partir del diff.
- `git add` de los archivos relevantes (NO agregues archivos ajenos/no relacionados sin confirmar), `git commit`, y `git push` a la rama correspondiente.
- Si estás en `main`, confirma con el usuario antes de push.

## 6. Despliegue a Producción (confirmar antes — acción irreversible)
Identifica qué submódulos cambiaron y **pide confirmación explícita** antes de ejecutar cada deploy (son PowerShell y tocan producción real):
- Cambios en **API** → `.\scripts\deploy_api_hetzner.ps1` (Hetzner, SSH)
- Cambios en **Web** → `.\scripts\deploy_web_hostinger.ps1` (Hostinger)
- Cambios de **schema Prisma** → considerar `.\scripts\push_schema_to_prod.ps1` (sin pérdida de datos)

Ejecuta los `.ps1` con PowerShell. Al terminar, informa el estado final del despliegue y, si es posible, corre un smoke test (`.\scripts\test_prod_smoke.ps1`) para verificar que producción responde.
