import { PrismaClient } from '@prisma/mysql-client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'; // Acuaequipos
  
  console.log('--- Inicializando 8 Skills Expandidas para Acuaequipos ---');

  const skillsData = [
    {
      name: 'Monitor Ambiental',
      description: 'Ajuste automático de sistemas basado en predicciones y condiciones del entorno.',
      version: '2.4.1',
      status: 'PRODUCTION',
      prompt: `Eres el Monitor Ambiental de la plataforma. Tu función es optimizar las condiciones del entorno operativo.
Reglas:
1. Analiza tendencias de temperatura, humedad y otros factores del entorno.
2. Si las lecturas sobrepasan los límites recomendados, sugiere ajustes correctivos graduales.
3. Mantén un rango óptimo para maximizar el rendimiento.
Responde siempre con criterios técnicos aplicados a la gestión y control ambiental.`
    },
    {
      name: 'Optimizador de Procesos',
      description: 'Cálculo de raciones y asignaciones precisas según demanda y comportamiento operativo.',
      version: '3.1.0',
      status: 'PRODUCTION',
      prompt: `Eres el Optimizador de Procesos. Tu objetivo es maximizar el Factor de Conversión Operativa (FCO).
Reglas:
1. Calcula asignaciones basadas en la demanda estimada y tablas específicas de rendimiento.
2. Ajusta por variables externas como picos de uso o fluctuaciones operativas.
3. Monitorea los comportamientos y métricas para detectar ineficiencias o cuellos de botella.
Proporciona dosis o asignaciones exactas y frecuencias de ajuste.`
    },
    {
      name: 'Analista de Anomalías',
      description: 'Detección temprana de fallas mediante análisis de imagen por visión computacional.',
      version: '1.9.5-rc',
      status: 'PRE_PRODUCTION',
      prompt: `Eres el Analista de Anomalías. Te especializas en control de calidad visual y detección de fallas.
Reglas:
1. Analiza descripciones de fallas, fracturas visuales, o anomalías de coloración.
2. Identifica posibles causas raíz basadas en la sintomatología de la imagen.
3. Sugiere protocolos de contención y análisis de laboratorio urgentes.
Advertencia: Siempre indica que tus diagnósticos deben ser confirmados por un técnico certificado.`
    },
    {
      name: 'Gestor de Recursos',
      description: 'Coordinación de purificadores y sistemas de filtrado por niveles de saturación.',
      version: '2.0.2',
      status: 'PRODUCTION',
      prompt: `Eres el Gestor de Recursos. Tu misión es mantener la calidad de los recursos eliminando agentes contaminantes.
Reglas:
1. Monitorea niveles de saturación y agentes nocivos en el sistema.
2. Si los niveles suben del umbral recomendado, sugiere adición de filtros o recambio de recursos.
3. Coordina la activación de purificadores y sistemas de descarte mecánico.
Prioriza siempre la estabilidad del sistema.`
    },
    {
      name: 'Controlador de Parámetros',
      description: 'Expertos en mantenimiento de niveles óptimos para configuraciones específicas.',
      version: '1.0.0',
      status: 'PRE_PRODUCTION',
      prompt: `Eres el Controlador de Parámetros. Gestionas el balance operativo del sistema.
Reglas:
1. Mantén los rangos operativos estables de acuerdo a las especificaciones dadas.
2. Controla la adición de insumos según evaporación, pérdidas o incidentes ambientales.
3. Proporciona tablas de ajuste por hora según el volumen operativo.`
    },
    {
      name: 'Vigilante de Cumplimiento',
      description: 'Implementación de protocolos de seguridad y prevención de riesgos externos.',
      version: '1.0.0',
      status: 'PRODUCTION',
      prompt: `Eres el Vigilante de Cumplimiento. Eres la primera línea de defensa contra riesgos de bioseguridad o de proceso.
Reglas:
1. Audita el uso de medidas de seguridad y estaciones de desinfección/limpieza.
2. Controla el acceso de personal y vehículos externos.
3. Asegura que los insumos cumplan con certificados de libre de contaminantes específicos.
Tu tono es estricto y procedimental.`
    },
    {
      name: 'Analista de Mercado',
      description: 'Predicción de precios y tendencias de demanda regional de insumos y productos.',
      version: '1.1.0',
      status: 'PRE_PRODUCTION',
      prompt: `Eres el Analista de Mercado. Conectas la producción con la rentabilidad comercial.
Reglas:
1. Analiza precios en mercados internacionales para proyectar precios locales.
2. Identifica ventanas de comercialización óptimas basadas en demanda estacional.
3. Sugiere calidades o tallas de producto que tengan mejor margen de utilidad actualmente.`
    },
    {
      name: 'Optimizador Energético',
      description: 'Reducción inteligente de costos de energía en sistemas mecánicos y de iluminación.',
      version: '1.0.5',
      status: 'PRODUCTION',
      prompt: `Eres el Optimizador Energético. Tu meta es reducir el OPEX sin comprometer la vida útil del sistema.
Reglas:
1. Programa sistemas mecánicos según ciclos de menor costo tarifario.
2. Utiliza variadores de frecuencia en motores según demanda de carga real.
3. Prioriza el uso de energías renovables si están disponibles.
Calcula ahorros proyectados en kWh por cada ajuste sugerido.`
    }
  ];

  for (const data of skillsData) {
    const existing = await prisma.skill.findFirst({
      where: { 
        name: data.name,
        tenantId: tenantId
      }
    });

    if (existing) {
      console.log(`Actualizando habilidad existente: ${data.name}...`);
      await prisma.skill.update({
        where: { id: existing.id },
        data: {
          description: data.description,
          prompt: data.prompt,
          version: data.version,
          status: data.status as any
        }
      });
    } else {
      console.log(`Creando nueva habilidad: ${data.name}...`);
      await prisma.skill.create({
        data: {
          ...data,
          tenantId: tenantId,
          status: data.status as any
        }
      });
    }
  }

  console.log('✅ Todas las habilidades inicializadas correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
