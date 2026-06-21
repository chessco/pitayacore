# Guía de Pruebas - PitayaCore API

Este documento detalla la infraestructura de pruebas implementada para garantizar la seguridad y estabilidad del ecosistema PitayaCore AI.

## Estructura de Pruebas

El proyecto utiliza **Jest** como motor de pruebas y **Supertest** para las pruebas de integración.

### 1. Pruebas Unitarias
Ubicadas junto al código fuente (`*.spec.ts`).
- **`ApiKeyGuard`**: Valida la lógica de autorización sin dependencias externas.
- **Controllers**: Verifican que los controladores tengan sus dependencias inyectadas correctamente.

### 2. Pruebas de Integración (E2E)
Ubicadas en la carpeta `test/`.
- **`auth.e2e-spec.ts`**: Prueba el flujo completo de autenticación contra el servidor NestJS real.
- **`app.e2e-spec.ts`**: Verifica la disponibilidad del servicio base.

---

## Cómo Ejecutar las Pruebas

### Pruebas Unitarias
Para ejecutar todas las pruebas unitarias:
```bash
npm run test
```
Para ejecutar una prueba específica:
```bash
npm run test -- api-key.guard.spec.ts
```

### Pruebas E2E
Para ejecutar las pruebas de integración (requiere que las variables de entorno estén configuradas en `.env`):
```bash
npm run test:e2e
```

---

## Seguridad y Autenticación

El sistema utiliza un `ApiKeyGuard` global (mediante `CombinedAuthGuard`). Todas las peticiones deben incluir la cabecera:

- **Header**: `x-api-key`
- **Valor**: Configurado en la variable de entorno `INTERNAL_API_KEY` (sin valor por defecto en producción para máxima seguridad).

### Ejemplo de petición autenticada (curl):
```bash
curl -X POST http://localhost:3015/api/ai/analyze-conversation \
  -H "x-api-key: <tu_internal_api_key_de_las_variables_de_entorno>" \
  -H "Content-Type: application/json" \
  -d '{"messages": []}'
```

---

## Mantenimiento

Al agregar nuevos controladores o servicios, asegúrate de:
1. Proveer el `ConfigService` en el `TestingModule`.
2. Mockear las dependencias necesarias para evitar llamadas a bases de datos reales durante las pruebas unitarias.
3. Verificar que los nuevos endpoints estén cubiertos por el `CombinedAuthGuard` o marcados explícitamente como públicos si es necesario.
