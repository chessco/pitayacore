# Manual de Operación: Human-In-The-Loop (HITL) en PitayaCore AI

Este manual describe el flujo de trabajo para la intervención humana en las conversaciones gestionadas por la IA de PitayaCore. El sistema HITL asegura que las dudas críticas o de baja confianza sean validadas por expertos antes o después de ser entregadas al cliente.

## 1. El Flujo de Trabajo (Workflow)

El ciclo de vida de una intervención HITL sigue estos pasos:

1.  **Detección/Escalado**:
    *   **Automático**: La IA detecta una baja confianza (< 85%) o un tema sensible (bioseguridad, patologías críticas).
    *   **Manual**: Un agente humano en la **Bandeja de Entrada** decide que la IA no es suficiente y pulsa el botón **"Escalar a HITL"**.
2.  **Cola de Revisión**: El caso aparece inmediatamente en la pestaña **HITL** del panel operativo.
3.  **Intervención**: Un experto (Biólogo, Asesor o Director) revisa la respuesta sugerida por la IA.
4.  **Aprobación/Sincronización**: Al aprobar la respuesta corregida, el sistema:
    *   Envía la respuesta final al cliente (vía WhatsApp/Flow).
    *   **Sincroniza** la corrección con la Base de Conocimiento para que la IA aprenda y no cometa el mismo error en el futuro.

## 2. Niveles de Intervención

PitayaCore maneja tres niveles de jerarquía para el escalado:

| Nivel | Rol Responsable | Tipo de Consultas |
| :--- | :--- | :--- |
| **BIOLOGIST** | Biólogo de Campo | Parámetros de agua, alimentación, salud inmediata. |
| **ADVISOR** | Asesor Técnico | Estrategias de cultivo, planificación a largo plazo. |
| **DIRECTOR** | Director de Producción | Decisiones financieras, cosecha, emergencias globales. |

## 3. Instrucciones para el Operador de Bandeja (Inbox)

Si estás en la Bandeja y notas que la IA está "alucinando" o el cliente está molesto:
1.  Abre el panel de **AI Copilot** (extremo derecho).
2.  Verifica el **Puntaje de Confianza**.
3.  Si es necesario, pulsa el botón rojo **"Escalar a HITL"**.
4.  Selecciona el nivel de escalado (por defecto: Biólogo).
5.  Opcional: Añade un comentario sobre por qué estás escalando.

## 4. Instrucciones para el Revisor (HITL)

Si eres el experto encargado de la revisión:
1.  Entra a la pestaña **HITL**.
2.  Selecciona el caso en la **Cola de Trabajo** (izquierda).
3.  Compara la **Respuesta de IA** (original) con la realidad técnica.
4.  Escribe la respuesta final en el cuadro de **Corrección Humana**.
5.  Pulsa **"Aprobar y Sincronizar"**.

---
**Nota de Seguridad**: Todas las intervenciones quedan registradas en el Audit Log del sistema para auditorías de calidad posteriores.
