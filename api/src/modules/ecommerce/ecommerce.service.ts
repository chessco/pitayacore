import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AiService } from '../ai/ai.service';
import * as PDFDocument from 'pdfkit';
import axios from 'axios';

import { CrmService } from '../crm/crm.service';

@Injectable()
export class EcommerceService {
  constructor(
    private db: DatabaseService,
    private ai: AiService,
    private crmService: CrmService
  ) {}

  async generateProductDescription(imageUrl: string, sector: string = 'retail') {
    const prompt = `Actúa como un experto en marketing y técnico especializado en el sector: ${sector.toUpperCase()}.
    Analiza la imagen adjunta de un producto y genera:
    1. Un nombre comercial atractivo.
    2. Una descripción detallada resaltando beneficios y especificaciones técnicas.
    3. 3 etiquetas clave (tags).
    
    Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
    {
      "suggestedName": "...",
      "description": "...",
      "tags": ["...", "...", "..."]
    }`;

    const result = await this.ai.analyzeVision(imageUrl, prompt);
    try {
      // Clean result in case of markdown blocks
      const jsonStr = result.replace(/```json|```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (err) {
      return { suggestedName: '', description: result, tags: [] };
    }
  }

  // PRODUCTS
  async findAllProducts(tenantId: string) {
    return this.db.mysql.product.findMany({
      where: { tenantId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(tenantId: string, data: any) {
    const { movements, ...productData } = data;
    const product = await this.db.mysql.product.create({
      data: {
        ...productData,
        tenantId,
      },
    });

    // Record initial stock as movement
    if (product.stock > 0) {
      await this.db.mysql.stockMovement.create({
        data: {
          productId: product.id,
          tenantId,
          type: 'IN',
          quantity: product.stock,
          reason: 'Initial stock',
        }
      });
    }

    return product;
  }

  async updateProduct(id: string, tenantId: string, data: any) {
    const { movements, ...productData } = data;
    return this.db.mysql.product.update({
      where: { id, tenantId },
      data: productData,
    });
  }

  async adjustStock(tenantId: string, productId: string, quantity: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', reason: string, userId?: string) {
    const product = await this.db.mysql.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    const newStock = type === 'IN' ? product.stock + quantity : product.stock - quantity;

    return this.db.mysql.$transaction([
      this.db.mysql.product.update({
        where: { id: productId },
        data: { stock: newStock }
      }),
      this.db.mysql.stockMovement.create({
        data: {
          productId,
          tenantId,
          type,
          quantity,
          reason,
          userId
        }
      })
    ]);
  }

  async getMovements(tenantId: string, productId?: string) {
    return this.db.mysql.stockMovement.findMany({
      where: { 
        tenantId,
        productId: productId || undefined
      },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  // CATEGORIES
  async findAllCategories(tenantId: string) {
    return this.db.mysql.category.findMany({
      where: { tenantId },
    });
  }

  async createCategory(tenantId: string, name: string) {
    return this.db.mysql.category.create({
      data: { name, tenantId },
    });
  }

  // ORDERS
  async findAllOrders(tenantId: string) {
    return this.db.mysql.order.findMany({
      where: { tenantId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrder(tenantId: string, data: any) {
    const { items, ...orderData } = data;
    
    // Fetch current costs for items
    const productIds = items.map((i: any) => i.productId);
    const products = await this.db.mysql.product.findMany({
      where: { id: { in: productIds } }
    });

    return this.db.mysql.$transaction(async (tx) => {
      // Unificación de Identidad: Buscar o crear contacto
      let contact = null;
      if (data.email || data.phone) {
        contact = await tx.contact.findFirst({
          where: { 
            tenantId, 
            OR: [
              ...(data.email ? [{ email: data.email }] : []),
              ...(data.phone ? [{ phone: data.phone }] : [])
            ]
          }
        });

        if (!contact) {
          contact = await tx.contact.create({
            data: {
              tenantId,
              name: data.customerName,
              email: data.email,
              phone: data.phone,
              status: 'CUSTOMER'
            }
          });
        }
      }

      const order = await tx.order.create({
        data: {
          tenantId,
          contactId: contact?.id,
          customerName: data.customerName,
          email: data.email,
          phone: data.phone,
          total: data.total,
          capsuleId: data.capsuleId,
          items: {
            create: items.map((item: any) => {
              const p = products.find(p => p.id === item.productId);
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                cost: p?.cost || 0
              };
            }),
          },
        },
      });

      // Deducción de puntos si se usaron
      if (data.usePoints && data.pointsUsed > 0 && contact) {
        const metadata: any = contact.metadata || {};
        const currentPoints = metadata.points || 0;
        await tx.contact.update({
          where: { id: contact.id },
          data: {
            metadata: {
              ...metadata,
              points: Math.max(0, currentPoints - data.pointsUsed)
            }
          }
        });
        
        await tx.activity.create({
          data: {
            tenantId,
            contactId: contact.id,
            type: 'ACUAPOINTS',
            subject: `-${data.pointsUsed} AcuaPoints canjeados`,
            content: `Canje de puntos por descuento en Orden #${order.id.slice(0,8)}`
          }
        });
      }

      // Recompensa de puntos por compra exitosa (Lealtad)
      if (contact) {
        const contactFresh = await tx.contact.findUnique({ where: { id: contact.id } });
        if (contactFresh) {
          const metadata: any = contactFresh.metadata || {};
          const currentPoints = (metadata.points || 0);
          const reward = 100; // Puntos por compra
          
          await tx.contact.update({
            where: { id: contact.id },
            data: {
              metadata: {
                ...metadata,
                points: currentPoints + reward
              }
            }
          });

          await tx.activity.create({
            data: {
              tenantId,
              contactId: contact.id,
              type: 'ACUAPOINTS',
              subject: `+${reward} AcuaPoints ganados`,
              content: `Premio por compra exitosa (Lealtad). Orden #${order.id.slice(0,8)}`
            }
          });
        }
      }

      // Log de Actividad Omnicanal
      if (contact) {
        await tx.activity.create({
          data: {
            tenantId,
            contactId: contact.id,
            type: 'ORDER',
            subject: `Nuevo Pedido #${order.id.slice(0,8)}`,
            content: `Pedido completado por $${data.total.toFixed(2)} desde ${data.capsuleId ? 'Cápsula' : 'Tienda'}.`
          }
        });
      }

      // Update stock and record movements for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            tenantId,
            type: 'SALE',
            quantity: item.quantity,
            reason: `Orden #${order.id.slice(0,8)}`,
          }
        });
      }

      return order;
    });
  }

  // INVOICING
  async generateInvoicePdf(orderId: string): Promise<Buffer> {
    const order = await this.db.mysql.order.findUnique({
      where: { id: orderId },
      include: { 
        items: { include: { product: true } },
        tenant: true
      }
    });

    if (!order) throw new Error('Order not found');

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const run = async () => {
        try {
          // Logo from Branding
          const branding = order.tenant.brandingConfig as any;
          if (branding?.logoUrl) {
            try {
              const response = await axios.get(branding.logoUrl, { responseType: 'arraybuffer' });
              const logoBuffer = Buffer.from(response.data, 'binary');
              doc.image(logoBuffer, 50, 45, { width: 50 });
              doc.moveDown();
            } catch (err) {
              console.error('Error loading logo for PDF:', err);
            }
          }

          // QR Code (Tracking)
          const qrData = `https://pitayacore.io/store/${order.tenant.slug}/order/${order.id}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
          try {
            const qrResponse = await axios.get(qrUrl, { responseType: 'arraybuffer' });
            const qrBuffer = Buffer.from(qrResponse.data, 'binary');
            doc.image(qrBuffer, 460, 45, { width: 80 });
            doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('RASTREAR PEDIDO', 460, 130, { width: 80, align: 'center' });
          } catch (err) {
            console.error('Error loading QR for PDF:', err);
          }

          // Header
          doc.fillColor('#000000').fontSize(22).font('Helvetica-Bold').text(order.tenant.name, 110, 50);
          doc.fontSize(10).font('Helvetica').text('Factura / Remisión de Venta', 110, 80);
          doc.fontSize(9).fillColor('#64748b').text(`ID: #${order.id.slice(0, 8)}`, 110, 95);
          
          doc.fillColor('#000000').fontSize(10).text(`Fecha: ${order.createdAt.toLocaleDateString()}`, 400, 50, { align: 'right' });
          doc.moveDown(4);

          // Divider
          doc.moveTo(50, 160).lineTo(550, 160).stroke('#f1f5f9');
          doc.moveDown(2);

          // Customer Info
          doc.fontSize(10).fillColor('#64748b').font('Helvetica-Bold').text('INFORMACIÓN DEL CLIENTE', 50, 180);
          doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text(order.customerName, 50, 195);
          doc.fontSize(10).font('Helvetica').text(order.email || 'N/A', 50, 210);
          doc.text(order.phone || 'N/A', 50, 225);
          doc.moveDown(3);

          // Items Table
          const tableTop = 270;
          doc.font('Helvetica-Bold').fontSize(10);
          doc.text('Descripción del Producto', 50, tableTop);
          doc.text('Cant.', 300, tableTop);
          doc.text('Precio Unit.', 350, tableTop);
          doc.text('Subtotal', 450, tableTop);
          
          doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#f1f5f9');
          doc.font('Helvetica').fontSize(10);

          let currentY = tableTop + 30;
          order.items.forEach(item => {
            doc.text(item.product.name, 50, currentY);
            doc.text(item.quantity.toString(), 300, currentY);
            doc.text(`$${item.price.toFixed(2)}`, 350, currentY);
            doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 450, currentY);
            currentY += 25;
          });

          // Summary box
          const summaryY = currentY + 30;
          doc.rect(350, summaryY, 200, 80).fill('#f8fafc');
          doc.fillColor('#64748b').fontSize(10).text('TOTAL A PAGAR', 365, summaryY + 20);
          doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text(`$${order.total.toFixed(2)}`, 365, summaryY + 40);

          // Footer
          const footerY = 700;
          doc.moveTo(50, footerY).lineTo(550, footerY).stroke('#f1f5f9');
          doc.fontSize(8).fillColor('#94a3b8').text('Gracias por su preferencia. Esta es una remisión electrónica generada por PitayaCore AI.', 50, footerY + 15, { align: 'center' });
          doc.text(`${order.tenant.name} - ${order.tenant.slug}.pitayacore.io`, 50, footerY + 30, { align: 'center' });

          doc.end();
        } catch (err) {
          reject(err);
        }
      };

      run();
    });
  }

  // REPORTS
  async getProfitabilityReport(tenantId: string) {
    const orders = await this.db.mysql.order.findMany({
      where: { 
        tenantId,
        status: { not: 'CANCELLED' }
      },
      include: { 
        items: {
          include: { product: true }
        },
        capsule: true
      }
    });

    let totalRevenue = 0;
    let totalCost = 0;
    const productStats: Record<string, { id: string, name: string, profit: number, revenue: number, quantity: number, image?: string | null }> = {};
    const attributionStats: Record<string, { name: string, revenue: number, orders: number }> = {};

    orders.forEach(order => {
      totalRevenue += order.total;

      // Attribution
      if (order.capsuleId && order.capsule) {
        const capId = order.capsuleId;
        if (!attributionStats[capId]) {
          attributionStats[capId] = { name: order.capsule.title, revenue: 0, orders: 0 };
        }
        attributionStats[capId].revenue += order.total;
        attributionStats[capId].orders += 1;
      }

      order.items.forEach(item => {
        const itemCost = item.cost ?? 0;
        totalCost += (itemCost * item.quantity);
        
        const productId = item.productId;
        if (!productStats[productId]) {
          productStats[productId] = { 
            id: productId,
            name: item.product?.name || 'Producto Eliminado', 
            profit: 0, 
            revenue: 0, 
            quantity: 0,
            image: item.product?.imageUrl
          };
        }
        
        const profit = (item.price - itemCost) * item.quantity;
        productStats[productId].profit += profit;
        productStats[productId].revenue += (item.price * item.quantity);
        productStats[productId].quantity += item.quantity;
      });
    });

    const netMargin = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return {
      totalRevenue,
      totalCost,
      netMargin,
      marginPercentage,
      orderCount: orders.length,
      topProducts,
      attribution: Object.entries(attributionStats).map(([id, stats]) => ({
        id,
        ...stats
      })).sort((a, b) => b.revenue - a.revenue)
    };
  }

  // CURRENCY
  async getExchangeRate() {
    // In a real app, this would call a fixer.io or similar API
    return 17.50; // Mock rate USD to MXN
  }

  // STOREFRONT (Public)
  async findPublicProductsBySlug(slug: string) {
    const tenant = await this.db.mysql.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new Error('Tenant not found');
    return this.findAllProducts(tenant.id);
  }

  async findPublicCategoriesBySlug(slug: string) {
    const tenant = await this.db.mysql.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new Error('Tenant not found');
    return this.findAllCategories(tenant.id);
  }

  async getOrderStatus(orderId: string) {
    return this.db.mysql.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    });
  }

  async createPublicOrder(slug: string, data: any) {
    const tenant = await this.db.mysql.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new Error('Tenant not found');
    return this.createOrder(tenant.id, data);
  }

  async createPaymentIntent(slug: string, amount: number) {
    const tenant = await this.db.mysql.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.stripeApiKey) throw new Error('Payments not configured for this store');
    
    // Stripe integration would go here
    // const stripe = new Stripe(tenant.stripeApiKey);
    // return stripe.paymentIntents.create({ amount, currency: 'usd' });
    
    return { clientSecret: 'mock_secret_' + Math.random().toString(36).substring(7) };
  }

  async getStockPredictions(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.db.mysql.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' }
      },
      include: { items: true }
    });

    const products = await this.db.mysql.product.findMany({
      where: { tenantId }
    });

    const salesVolume: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        salesVolume[item.productId] = (salesVolume[item.productId] || 0) + item.quantity;
      });
    });

    return products.map(p => {
      const totalSold = salesVolume[p.id] || 0;
      const dailyRate = totalSold / 30;
      const daysLeft = dailyRate > 0 ? Math.floor(p.stock / dailyRate) : Infinity;

      return {
        id: p.id,
        name: p.name,
        currentStock: p.stock,
        dailyRate: dailyRate.toFixed(2),
        daysLeft: daysLeft === Infinity ? 999 : daysLeft,
        status: daysLeft <= 5 ? 'CRITICAL' : daysLeft <= 15 ? 'WARNING' : 'OK'
      };
    });
  }

  async getAiInsights(tenantId: string) {
    const report = await this.getProfitabilityReport(tenantId);
    const predictions = await this.getStockPredictions(tenantId);

    const prompt = `Actúa como un Director Financiero (CFO) y Estratega de Ecommerce experto para la plataforma PitayaCore.
    Analiza los siguientes datos de rendimiento de la tienda y proporciona 3 a 5 insights accionables y estratégicos para el dueño del negocio.
    
    DATOS FINANCIEROS (Últimos 30 días aprox):
    - Ventas Totales: $${report.totalRevenue.toFixed(2)}
    - Costo de Ventas: $${report.totalCost.toFixed(2)}
    - Margen Neto: $${report.netMargin.toFixed(2)}
    - Porcentaje de Margen Promedio: ${report.marginPercentage.toFixed(1)}%
    - Cantidad de Órdenes: ${report.orderCount}
    
    PRODUCTOS CON MAYOR RENTABILIDAD (Top 5):
    ${report.topProducts.map((p: any) => `- ${p.name}: Ganancia $${p.profit.toFixed(2)}, Unidades ${p.quantity}`).join('\n')}
    
    PRODUCTOS EN RIESGO DE AGOTAMIENTO:
    ${predictions.filter((p: any) => p.status !== 'OK').map((p: any) => `- ${p.name}: Se agota en ${p.daysLeft} días (Stock: ${p.currentStock})`).join('\n')}
    
    INSTRUCCIONES:
    1. Sé muy específico con los nombres de los productos.
    2. Da consejos sobre precios si el margen es bajo.
    3. Da consejos de inventario basado en los riesgos de agotamiento.
    4. El tono debe ser profesional, ejecutivo, directo y orientado a resultados.
    
    Responde ÚNICAMENTE en formato Markdown profesional con emojis sutiles.`;

    const insights = await this.ai.generateRaw(prompt);
    return { insights };
  }
  async getDashboardWidgets(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await this.db.mysql.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: today },
        status: { not: 'CANCELLED' }
      },
      include: { items: true }
    });

    let dailyRevenue = 0;
    let dailyProfit = 0;
    todayOrders.forEach(order => {
      dailyRevenue += order.total;
      order.items.forEach(item => {
        dailyProfit += (item.price - (item.cost ?? 0)) * item.quantity;
      });
    });

    const predictions = await this.getStockPredictions(tenantId);
    const criticalStock = predictions
      .filter(p => p.currentStock <= 10) 
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 3);

    return {
      dailyRevenue,
      dailyProfit,
      orderCount: todayOrders.length,
      criticalStock
    };
  }
}
