import axios from 'axios';

/**
 * PITAYACORE CAPSULE STUDIO - QA TEST SUITE
 * Certifica la integridad técnica y funcional de las cápsulas.
 */

const CONFIG = {
  baseUrl: 'http://localhost:3014',
  tenantA: {
    id: 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718', // Acuaequipos
    apiKey: process.env.INTERNAL_API_KEY || 'SET_IN_ENV'
  },
  tenantB: {
    id: 'another-tenant-id', // Para pruebas de aislamiento
    apiKey: 'another-secret'
  },
  validAgentId: 'ad4962fd-9bc7-4def-8539-a69b4d8a2788' 
};

async function runQA() {
  console.log('🧪 INICIANDO SUITE DE PRUEBAS QA - CAPSULE STUDIO');
  console.log('================================================');
  
  let totalTests = 0;
  let passedTests = 0;

  const assert = (condition: boolean, message: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  };

  const apiA = axios.create({
    baseURL: CONFIG.baseUrl,
    headers: { 'x-tenant-id': CONFIG.tenantA.id, 'x-api-key': CONFIG.tenantA.apiKey }
  });

  const apiPublic = axios.create({ baseURL: CONFIG.baseUrl });

  try {
    // --- BLOQUE 1: CICLO DE VIDA DE CÁPSULA ---
    console.log('\n📦 BLOQUE 1: Ciclo de Vida y Reglas de Estado');
    
    const slug = `qa-test-${Date.now()}`;
    let capsuleId = '';

    // 1.1 Creación exitosa (Draft)
    const createRes = await apiA.post('/api/capsule-studio/capsules', {
      title: 'Cápsula QA Automática',
      slug,
      topic: 'Test',
      agentId: CONFIG.validAgentId,
      contentBlocks: [],
      status: 'DRAFT'
    });
    capsuleId = createRes.data.id;
    assert(createRes.status === 201, 'Creación de cápsula en estado DRAFT');

    // 1.2 Visibilidad restringida (Public API)
    try {
      await apiPublic.get(`/api/capsules/${slug}`);
      assert(false, 'La API Pública NO debe ver una cápsula en DRAFT');
    } catch (e) {
      assert(e.response?.status === 404, 'API Pública protege correctamente los borradores (404)');
    }

    // 1.3 Visibilidad Studio (Draft Access)
    const studioRes = await apiA.get(`/api/capsule-studio/capsules/slug/${slug}`);
    assert(studioRes.status === 200, 'API Studio permite ver borradores con autenticación');

    // 1.4 Cambio de Estado a PUBLISHED
    await apiA.patch(`/api/capsule-studio/capsules/${capsuleId}/status`, { status: 'PUBLISHED' });
    const publicRes = await apiPublic.get(`/api/capsules/${slug}`);
    assert(publicRes.status === 200, 'Cápsula visible públicamente tras cambiar a PUBLISHED');

    // --- BLOQUE 2: REGLAS DE PROTECCIÓN DE DATOS ---
    console.log('\n🛡️ BLOQUE 2: Reglas de Integridad (Anti-Borrado)');

    // 2.1 Bloqueo de borrado de cápsula publicada
    try {
      await apiA.delete(`/api/capsule-studio/capsules/${capsuleId}`);
      assert(false, 'No debería permitir borrar una cápsula PUBLISHED');
    } catch (e) {
      assert(e.response?.status === 409, 'Bloqueo de borrado exitoso (409 Conflict) para cápsulas publicadas');
    }

    // --- BLOQUE 3: CHAT Y PREVIEW ---
    console.log('\n💬 BLOQUE 3: Motor de Chat y Preview');

    // 3.1 Chat con Draft vía Studio
    const chatDraftRes = await apiA.post(`/api/capsule-studio/capsules/slug/${slug}/chat`, {
      message: '¿Cuál es el mejor FCA?',
      userId: 'qa-user'
    });
    assert(chatDraftRes.data.content !== undefined, 'El motor de chat responde a previsualizaciones de borradores');

    // --- BLOQUE 4: CAMPAÑAS ---
    console.log('\n📧 BLOQUE 4: Campañas y Seguridad');

    // 4.1 Crear Campaña
    const campRes = await apiA.post('/api/capsule-studio/campaigns', {
      name: 'Campaña QA',
      capsuleId,
      subject: 'Test QA',
      content: 'Contenido QA'
    });
    const campId = campRes.data.id;
    assert(campRes.status === 201, 'Creación de campaña asociada a cápsula');

    // 4.2 Borrado de Campaña no enviada (Debe funcionar)
    const delCampRes = await apiA.delete(`/api/capsule-studio/campaigns/${campId}`);
    assert(delCampRes.status === 200, 'Permite borrar campañas que NO han sido enviadas aún');

    // --- LIMPIEZA FINAL ---
    console.log('\n🧹 LIMPIEZA FINAL');
    await apiA.patch(`/api/capsule-studio/capsules/${capsuleId}/status`, { status: 'DRAFT' });
    await apiA.delete(`/api/capsule-studio/capsules/${capsuleId}`);
    console.log('✅ Entorno QA limpio.');

    console.log('\n================================================');
    console.log(`📊 RESULTADO FINAL: ${passedTests}/${totalTests} TESTS PASADOS`);
    if (passedTests === totalTests) {
      console.log('🌟 SISTEMA CERTIFICADO - LISTO PARA PRODUCCIÓN');
    } else {
      console.error('🛑 FALLOS DETECTADOS - REVISAR LOGS');
    }

  } catch (error) {
    console.error('💥 ERROR FATAL EN SUITE QA:', error.response?.data || error.message);
  }
}

runQA();
