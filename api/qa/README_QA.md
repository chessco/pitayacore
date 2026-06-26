# 🛡️ Capsule Studio QA Testing Bed

Esta suite de pruebas automatizada permite certificar la integridad técnica y funcional del módulo de Cápsulas en PitayaCore.

## 🚀 Cómo Ejecutar los Tests

Desde la carpeta `api`, ejecuta el siguiente comando:

```bash
npx ts-node qa/capsule_qa_suite.ts
```

## 🔍 Cobertura de Pruebas

La suite realiza las siguientes validaciones críticas:

### 📦 Ciclo de Vida de Cápsulas
- **Creación en Borrador**: Verifica que se pueden crear cápsulas y que no son visibles públicamente por accidente.
- **Transición de Estados**: Valida el paso de `DRAFT` a `PUBLISHED` y la actualización de visibilidad en la API pública.
- **Aislamiento**: Asegura que los borradores solo son accesibles a través de los endpoints autenticados del Studio.

### 🛡️ Reglas de Integridad (Business Rules)
- **Protección de Borrado**: Intenta borrar una cápsula publicada y verifica que el servidor lo impide con un error `409 Conflict`.
- **Integridad de Campañas**: Valida que las campañas enviadas no puedan ser eliminadas, protegiendo el historial de comunicación.

### 💬 Experiencia de Usuario (Chat)
- **Chat en Preview**: Certifica que el motor de IA puede interactuar con cápsulas en borrador (Studio Preview) sin errores 404.
- **Persistencia de Conversación**: Verifica la creación de IDs de conversación durante el chat.

### 📧 Gestión de Campañas
- **Flujo de Campañas**: Creación y validación de permisos de borrado según el estado de envío.

---
**Nota**: Para añadir más agentes o cambiar el tenant de prueba, edita el objeto `CONFIG` en `qa/capsule_qa_suite.ts`.
