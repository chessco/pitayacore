import { 
  MessageSquare, 
  Layout, 
  Database, 
  BarChart3, 
  Users, 
  Zap,
  Settings,
  BookOpen,
  Cpu,
  ShieldCheck,
  MessageSquareQuote,
  TrendingUp,
  FileText,
  Eye,
  LayoutDashboard,
  Package,
  ShoppingBag,
  CreditCard,
  Target,
  Trophy,
  FolderOpen,
  Layers,
  Palette,
  Server,
  ShieldAlert
} from 'lucide-react';
import { WorkspaceView } from './workspace/WorkspaceView';
import { Inbox } from './inbox/Inbox';
import { CapsuleList } from './capsules/Studio/CapsuleList';
import { CampaignManager } from './capsules/Studio/CampaignManager';
import { DonJuanChat } from './donjuan/DonJuanChat';
import { LeadManager } from './capsules/Studio/LeadManager';
import { KnowledgeBase } from './knowledge/KnowledgeBase';
import { Analytics } from './analytics/Analytics';
import { AgentsManager } from './agents/AgentsManager';
import { SkillsManager } from './skills/SkillsManager';
import { UserManager } from './users/UserManager';
import { HITL } from './hitl/HITL';
import { CorrectionsManager } from './corrections/CorrectionsManager';
import { TenantManager } from './tenants/TenantManager';
import { PredictiveHub } from './predictive/PredictiveHub';
import { ProtocolArchitecture } from './protocols/ProtocolArchitecture';
import { VisionLab } from './vision/VisionLab';
import { ProductsManager } from './ecommerce/ProductsManager';
import { OrdersManager } from './ecommerce/OrdersManager';
import { StorefrontConfig } from './ecommerce/storefront/StorefrontConfig';
import { PaymentsConfig } from './ecommerce/storefront/PaymentsConfig';
import { ProfitabilityReport } from './ecommerce/ProfitabilityReport';
import { ContactsManager } from './crm/ContactsManager';
import { DealsBoard } from './crm/DealsBoard';
import { LeadScoring } from './crm/LeadScoring';
import { CRMOverview } from './crm/CRMOverview';
import { ModuleManager } from './system/ModuleManager';
import SocialSuiteView from './social/SocialSuiteView';
import { IdentityPlatform } from './identity/IdentityPlatform';
import { AppearanceDashboard } from './design/AppearanceDashboard';
import { OperationsManager } from './operations/OperationsManager';
import { SentinelAI } from './sentinel/SentinelAI';

export interface ModuleConfig {
  id: string;           
  label: string;        
  icon: any;            
  component: any;       
  description: string;  
  category: 'operativo' | 'gestion' | 'sistema' | 'avanzado' | 'crm';
  suiteId?: string;
  featureId?: string;
}

export const AVAILABLE_MODULES: ModuleConfig[] = [
  {
    id: 'dashboard',
    label: 'Panel Control',
    icon: LayoutDashboard,
    component: null, 
    description: 'Vista general del rendimiento.',
    category: 'operativo'
  },
  {
    id: 'conversations',
    label: 'Inbox AI',
    icon: MessageSquare,
    component: Inbox,
    description: 'Gestión de mensajes multicanal con Copiloto IA.',
    category: 'operativo'
  },
  {
    id: 'capsules',
    label: 'Cápsulas AI',
    icon: Layout,
    component: CapsuleList,
    description: 'Gestión de cápsulas de contenido y conversión.',
    category: 'operativo',
    suiteId: 'intelligence',
    featureId: 'capsules'
  },
  {
    id: 'campaigns',
    label: 'Campañas',
    icon: Zap,
    component: CampaignManager,
    description: 'Gestión de envíos masivos y automatizados.',
    category: 'operativo',
    suiteId: 'intelligence',
    featureId: 'campaigns'
  },
  {
    id: 'leads',
    label: 'Leads AI',
    icon: Users,
    component: LeadManager,
    description: 'Gestión de prospectos generados por IA.',
    category: 'operativo',
    suiteId: 'intelligence',
    featureId: 'leads'
  },
  {
    id: 'donjuan',
    label: 'Asistente Interno AI',
    icon: MessageSquareQuote,
    component: DonJuanChat,
    description: 'Interacción interna con catálogo de agentes IA.',
    category: 'operativo',
    suiteId: 'intelligence',
    featureId: 'internal_assistant'
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: FolderOpen,
    component: WorkspaceView,
    description: 'Centro de trabajo, conocimiento y memoria operativa.',
    category: 'operativo',
    suiteId: 'workspace',
    featureId: 'overview'
  },
  {
    id: 'agents',
    label: 'Agentes',
    icon: Users,
    component: AgentsManager,
    description: 'Configuración de Personas y Agentes de IA.',
    category: 'operativo',
    suiteId: 'intelligence',
    featureId: 'agents'
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: Cpu,
    component: SkillsManager,
    description: 'Herramientas y habilidades extendidas para la IA.',
    category: 'operativo'
  },
  {
    id: 'hitl',
    label: 'HITL',
    icon: ShieldCheck,
    component: HITL,
    description: 'Intervención humana en tiempo real.',
    category: 'operativo'
  },
  {
    id: 'kb',
    label: 'Conocimiento',
    icon: BookOpen,
    component: KnowledgeBase,
    description: 'Gestión de documentos y entrenamiento de la IA.',
    category: 'operativo'
  },
  {
    id: 'predictive',
    label: 'Hub Predictivo',
    icon: TrendingUp,
    component: PredictiveHub,
    description: 'Análisis predictivo de comportamiento.',
    category: 'avanzado',
    suiteId: 'intelligence',
    featureId: 'predictive'
  },
  {
    id: 'protocols',
    label: 'Arq. Protocolos',
    icon: FileText,
    component: ProtocolArchitecture,
    description: 'Diseño de protocolos de comunicación.',
    category: 'avanzado',
    suiteId: 'intelligence',
    featureId: 'protocols'
  },
  {
    id: 'vision',
    label: 'Lab Visión',
    icon: Eye,
    component: VisionLab,
    description: 'Procesamiento de imágenes y visión artificial.',
    category: 'avanzado',
    suiteId: 'intelligence',
    featureId: 'vision'
  },
  {
    id: 'corrections',
    label: 'Correcciones',
    icon: MessageSquareQuote,
    component: CorrectionsManager,
    description: 'Gestión de respuestas pre-aprobadas.',
    category: 'gestion'
  },
  {
    id: 'analytics',
    label: 'Analíticas',
    icon: BarChart3,
    component: Analytics,
    description: 'Métricas avanzadas y reportes de rendimiento.',
    category: 'gestion'
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: Users,
    component: UserManager,
    description: 'Administración de accesos y perfiles.',
    category: 'gestion'
  },
  {
    id: 'tenants',
    label: 'Inquilinos',
    icon: Layout,
    component: TenantManager,
    description: 'Gestión de múltiples organizaciones.',
    category: 'sistema'
  },
  {
    id: 'catalog',
    label: 'Catálogo Ventas',
    icon: Package,
    component: ProductsManager,
    description: 'Gestión de productos y precios.',
    category: 'gestion',
    suiteId: 'ecommerce',
    featureId: 'catalog'
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: ShoppingBag,
    component: OrdersManager,
    description: 'Control de ventas y facturación.',
    category: 'gestion',
    suiteId: 'ecommerce',
    featureId: 'orders'
  },
  {
    id: 'storefront',
    label: 'Tienda Online',
    icon: Layout,
    component: StorefrontConfig,
    description: 'Personalización de la tienda pública.',
    category: 'gestion',
    suiteId: 'ecommerce',
    featureId: 'storefront'
  },
  {
    id: 'payments',
    label: 'Pasarela Pagos',
    icon: CreditCard,
    component: PaymentsConfig,
    description: 'Configuración de cobros con Stripe.',
    category: 'gestion',
    suiteId: 'ecommerce',
    featureId: 'payments'
  },
  {
    id: 'profitability',
    label: 'Rentabilidad',
    icon: TrendingUp,
    component: ProfitabilityReport,
    description: 'Análisis de margen y rentabilidad real.',
    category: 'gestion',
    suiteId: 'ecommerce',
    featureId: 'profitability'
  },
  {
    id: 'crm-overview',
    label: 'Dashboard CRM',
    icon: LayoutDashboard,
    component: CRMOverview,
    description: 'Métricas clave y salud del embudo de ventas.',
    category: 'crm',
    suiteId: 'crm',
    featureId: 'overview'
  },
  {
    id: 'crm',
    label: 'Contactos CRM',
    icon: Users,
    component: ContactsManager,
    description: 'Gestión inteligente de contactos y leads.',
    category: 'crm',
    suiteId: 'crm',
    featureId: 'contacts'
  },
  {
    id: 'deals',
    label: 'Pipeline Ventas',
    icon: Trophy,
    component: DealsBoard,
    description: 'Tablero Kanban de oportunidades de venta.',
    category: 'crm',
    suiteId: 'crm',
    featureId: 'deals'
  },
  {
    id: 'scoring',
    label: 'Scoring IA',
    icon: Target,
    component: LeadScoring,
    description: 'Priorización inteligente de prospectos por comportamiento.',
    category: 'crm',
    suiteId: 'crm',
    featureId: 'scoring'
  },
  {
    id: 'module_manager',
    label: 'Marketplace',
    icon: Package,
    component: ModuleManager,
    description: 'Activación dinámica de capacidades SaaS.',
    category: 'sistema'
  },
  {
    id: 'operations_suite',
    label: 'Runtime Operations',
    icon: Server,
    component: OperationsManager,
    description: 'Gestión de Workers Deterministas y Orquestación de Trabajos.',
    category: 'sistema'
  },

  {
    id: 'identity',
    label: 'Identidad',
    icon: ShieldCheck,
    component: IdentityPlatform,
    description: 'Plataforma de identidad RBAC: roles, permisos, contextos y verticales.',
    category: 'sistema'
  },
  {
    id: 'social_suite',
    label: 'Social Suite',
    icon: MessageSquareQuote,
    component: SocialSuiteView,
    description: 'AI-powered Social Operating System para marcas y campañas.',
    category: 'avanzado',
    suiteId: 'social',
    featureId: 'SOCIAL_SUITE'
  },
  {
    id: 'design_suite',
    label: 'Design Suite',
    icon: Palette,
    component: AppearanceDashboard,
    description: 'Personalización de marca blanca, temas dinámicos y tokens visuales.',
    category: 'sistema'
  },
  {
    id: 'sentinel',
    label: 'Sentinel AI',
    icon: ShieldAlert,
    component: SentinelAI,
    description: 'Inteligencia social impulsada por IA: incidentes, tendencias, sentimiento y alertas.',
    category: 'avanzado'
  }
];
