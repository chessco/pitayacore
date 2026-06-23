import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class CrmService {
  constructor(private db: DatabaseService) {}

  async findAllContacts(tenantId: string) {
    return this.db.mysql.contact.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { orders: true, leads: true, deals: true, tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findContactById(id: string, tenantId: string) {
    return this.db.mysql.contact.findUnique({
      where: { id, tenantId },
      include: {
        activities: { orderBy: { createdAt: 'desc' } },
        orders: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        leads: { include: { capsule: true }, orderBy: { createdAt: 'desc' } },
        deals: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { dueDate: 'asc' } },
      },
    });
  }

  async createContact(tenantId: string, data: any) {
    return this.db.mysql.contact.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async updateContact(id: string, tenantId: string, data: any) {
    return this.db.mysql.contact.update({
      where: { id, tenantId },
      data,
    });
  }

  async createActivity(tenantId: string, data: any) {
    return this.db.mysql.activity.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async getDeals(tenantId: string) {
    return this.db.mysql.deal.findMany({
      where: { tenantId },
      include: { contact: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createDeal(tenantId: string, data: any) {
    return this.db.mysql.deal.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async updateDeal(id: string, tenantId: string, data: any) {
    return this.db.mysql.deal.update({
      where: { id, tenantId },
      data,
    });
  }

  async upsertContactFromActivity(
    tenantId: string,
    email: string,
    name: string,
    phone?: string,
  ) {
    const existing = await this.db.mysql.contact.findFirst({
      where: { tenantId, OR: [{ email }, { phone }] },
    });

    if (existing) {
      return existing;
    }

    return this.db.mysql.contact.create({
      data: {
        tenantId,
        email,
        name,
        phone,
        status: 'LEAD',
      },
    });
  }
  async addPoints(
    contactId: string,
    tenantId: string,
    amount: number,
    reason: string,
  ) {
    const contact = await this.db.mysql.contact.findUnique({
      where: { id: contactId, tenantId },
    });
    if (!contact) return null;

    const metadata: any = contact.metadata || {};
    const currentPoints = metadata.points || 0;
    const newPoints = currentPoints + amount;

    await this.db.mysql.contact.update({
      where: { id: contactId, tenantId },
      data: {
        metadata: {
          ...metadata,
          points: newPoints,
        },
      },
    });

    await this.createActivity(tenantId, {
      contactId,
      type: 'ACUAPOINTS',
      subject: `+${amount} AcuaPoints ganados`,
      content: `Razón: ${reason}. Saldo actual: ${newPoints}`,
    });

    return newPoints;
  }

  async calculateLeadScores(tenantId: string) {
    const contacts = await this.db.mysql.contact.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            orders: true,
            leads: true,
            deals: true,
            activities: true,
            tasks: true,
          },
        },
        activities: { take: 5, orderBy: { createdAt: 'desc' } },
        leads: { include: { capsule: true }, take: 3 },
        tasks: { where: { status: 'PENDING' }, take: 1 },
      },
    });

    return contacts
      .map((contact) => {
        // Logic: Orders (25) + Leads (10) + Deals (15) + Activity (5) + Tasks (10)
        const score =
          contact._count.orders * 25 +
          contact._count.leads * 10 +
          contact._count.deals * 15 +
          contact._count.activities * 5 +
          contact._count.tasks * 10;

        let temperature: 'HOT' | 'WARM' | 'COLD' = 'COLD';
        if (score > 50) temperature = 'HOT';
        else if (score > 20) temperature = 'WARM';

        // Generate Explanations (AI Insights)
        const reasons: string[] = [];
        if (contact._count.orders > 0) {
          reasons.push(
            contact._count.orders > 1
              ? `Cliente recurrente con ${contact._count.orders} pedidos`
              : 'Realizó su primera compra',
          );
        }
        if (contact._count.leads > 0) {
          const lastCapsule = contact.leads[0]?.capsule?.title;
          reasons.push(`Interesado en la cápsula: "${lastCapsule}"`);
        }
        if (contact._count.activities > 0) {
          const hasWhatsApp = contact.activities.some(
            (a) => a.type === 'WHATSAPP',
          );
          if (hasWhatsApp)
            reasons.push('Mantiene comunicación activa vía WhatsApp');
        }
        if (contact._count.deals > 0) {
          reasons.push(`Tiene ${contact._count.deals} negociaciones en curso`);
        }
        if (contact._count.tasks > 0) {
          reasons.push(
            `Tiene ${contact._count.tasks} tareas o citas pendientes`,
          );
        }

        return {
          ...contact,
          score,
          temperature,
          insights: reasons.slice(0, 3),
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async getSalesForecast(tenantId: string) {
    const deals = await this.db.mysql.deal.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const orders = await this.db.mysql.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    const stageProbabilities: Record<string, number> = {
      NEW: 0.1,
      CONTACTED: 0.25,
      PROPOSAL: 0.5,
      NEGOTIATION: 0.8,
      WON: 1.0,
      LOST: 0,
    };

    // Calculate monthly historical revenue
    const monthlyRevenue: Record<string, number> = {};
    orders.forEach((order) => {
      const month = order.createdAt.toLocaleString('default', {
        month: 'short',
      });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.total;
    });

    // Calculate weighted pipeline
    const weightedPipeline = deals.reduce((acc, deal) => {
      if (deal.status === 'OPEN') {
        return acc + deal.value * (stageProbabilities[deal.stage] || 0.1);
      }
      return acc;
    }, 0);

    // AI Prediction: Simple linear projection + weighted pipeline
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const currentMonthIdx = new Date().getMonth();

    const forecastData = [];
    for (let i = -3; i <= 3; i++) {
      const idx = (currentMonthIdx + i + 12) % 12;
      const monthName = months[idx];
      const isFuture = i > 0;

      let value = monthlyRevenue[monthName] || 0;
      if (isFuture) {
        // Simple prediction logic: Avg of last 3 months + (Weighted Pipeline / 3)
        const avgPast =
          Object.values(monthlyRevenue)
            .slice(-3)
            .reduce((a, b) => a + b, 0) / 3 || 5000;
        value = avgPast + (weightedPipeline / 3) * (1 + i * 0.1); // Adding a growth factor
      }

      forecastData.push({
        name: monthName,
        revenue: Math.round(value),
        type: isFuture ? 'PREDICTION' : 'HISTORICAL',
      });
    }

    return {
      forecastData,
      totalForecastNextMonth: Math.round(
        forecastData.find((f) => f.type === 'PREDICTION')?.revenue || 0,
      ),
      confidenceScore: 0.85,
    };
  }

  async getSmartSegments(tenantId: string) {
    const contacts = await this.db.mysql.contact.findMany({
      where: { tenantId },
      include: {
        _count: { select: { orders: true, activities: true, leads: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        orders: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const scoring = await this.calculateLeadScores(tenantId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const segments = [
      {
        id: 'hot_leads_no_order',
        name: 'Leads Calientes (Sin Compras)',
        description:
          'Leads con alto score que aún no han realizado su primer pedido.',
        contacts: scoring
          .filter((s) => s.temperature === 'HOT' && s._count.orders === 0)
          .map((s) => s.id),
      },
      {
        id: 'vip_inactive',
        name: 'VIPs Inactivos (30 días)',
        description:
          'Clientes VIP que no han tenido actividad registrada en el último mes.',
        contacts: contacts
          .filter((c) => {
            const lastActivity = c.activities[0]?.createdAt || new Date(0);
            return c.status === 'VIP' && new Date(lastActivity) < thirtyDaysAgo;
          })
          .map((c) => c.id),
      },
      {
        id: 'customer_recovery',
        name: 'Recuperación de Clientes',
        description:
          'Clientes que no han comprado nada en los últimos 60 días.',
        contacts: contacts
          .filter((c) => {
            const lastOrder = c.orders[0]?.createdAt || new Date(0);
            return c._count.orders > 0 && new Date(lastOrder) < sixtyDaysAgo;
          })
          .map((c) => c.id),
      },
      {
        id: 'new_leads',
        name: 'Nuevos Prospectos AI',
        description: 'Leads capturados por cápsulas en las últimas 48 horas.',
        contacts: contacts
          .filter((c) => {
            const fortyEightHoursAgo = new Date(
              now.getTime() - 48 * 60 * 60 * 1000,
            );
            return (
              c.status === 'LEAD' && new Date(c.createdAt) > fortyEightHoursAgo
            );
          })
          .map((c) => c.id),
      },
    ];

    return segments;
  }

  async findByEmail(email: string, tenantId: string) {
    return this.db.mysql.contact.findFirst({
      where: { email, tenantId },
    });
  }

  // TASKS & APPOINTMENTS
  async findAllTasks(tenantId: string) {
    return this.db.mysql.task.findMany({
      where: { tenantId },
      include: { contact: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async createTask(tenantId: string, data: any) {
    return this.db.mysql.task.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async updateTask(id: string, tenantId: string, data: any) {
    return this.db.mysql.task.update({
      where: { id, tenantId },
      data,
    });
  }
}
