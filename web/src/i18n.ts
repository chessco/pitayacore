import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    lng: 'es', // Force Spanish as default
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      es: {
        translation: {
          app_name: "PitayaCore AI",
          welcome: "Bienvenido al Sistema Operativo Inteligente Multi-Tenant",
          technical_support: "Soporte Técnico",
          biologists: "Expertos",
          don_juan_camaron: "OmniAgent AI",
          dashboard: "Tablero",
          tenants: "Inquilinos",
          skills: "Habilidades",
          agents: "Agentes",
          hitl: "HITL",
          knowledge: "Conocimiento",
          inbox: "Bandeja",
          logs: "Logs Globales",
          infra: "Infraestructura",
          settings: "Configuración",
          logout: "Cerrar Sesión",
          system_command_center: "Centro de Comando de Sistema",
          system_subtitle: "Monitoreo de infraestructura global y gestión multi-inquilino.",
          global_config: "Configuración Global",
          global_config_subtitle: "Ajustes maestros del sistema PitayaCore AI.",
          language: "Idioma de la Plataforma",
          language_desc: "Selecciona el idioma preferido para la interfaz.",
          "nav.monitor_operativo": "Monitor Operativo",
          "nav.gestion_sistema": "Gestión Sistema",
        },
      },
      en: {
        translation: {
          app_name: "PitayaCore AI",
          welcome: "Welcome to the Multi-Tenant Intelligent Operating System",
          technical_support: "Technical Support",
          biologists: "Experts",
          don_juan_camaron: "OmniAgent AI",
          dashboard: "Dashboard",
          tenants: "Tenants",
          skills: "Skills",
          agents: "Agents",
          hitl: "HITL",
          knowledge: "Knowledge Base",
          inbox: "Inbox",
          logs: "Global Logs",
          infra: "Infrastructure",
          settings: "Settings",
          logout: "Logout",
          system_command_center: "System Command Center",
          system_subtitle: "Global infrastructure monitoring and multi-tenant management.",
          global_config: "Global Configuration",
          global_config_subtitle: "Master settings for the PitayaCore AI system.",
          language: "Platform Language",
          language_desc: "Select your preferred interface language.",
          "nav.monitor_operativo": "Operational Monitor",
          "nav.gestion_sistema": "System Management",
        },
      },
    },
  });

export default i18n;

