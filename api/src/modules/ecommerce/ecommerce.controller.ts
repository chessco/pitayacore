import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import * as express from 'express';
import { EcommerceService } from './ecommerce.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';

@Controller('ecommerce')
export class EcommerceController {
  constructor(private readonly ecommerceService: EcommerceService) {}

  @Get('products')
  findAllProducts(@Headers('x-tenant-id') tenantId: string) {
    return this.ecommerceService.findAllProducts(tenantId);
  }

  @Post('products/generate-description')
  generateDescription(
    @Body('imageUrl') imageUrl: string,
    @Body('sector') sector: string,
  ) {
    return this.ecommerceService.generateProductDescription(imageUrl, sector);
  }

  @Post('products')
  createProduct(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.ecommerceService.createProduct(tenantId, data);
  }

  @Patch('products/:id')
  updateProduct(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.ecommerceService.updateProduct(id, tenantId, data);
  }

  @Post('products/:id/stock-adjust')
  adjustStock(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.ecommerceService.adjustStock(
      tenantId,
      id,
      data.quantity,
      data.type,
      data.reason,
      data.userId,
    );
  }

  @Get('movements')
  getMovements(
    @Headers('x-tenant-id') tenantId: string,
    @Param('productId') productId?: string,
  ) {
    return this.ecommerceService.getMovements(tenantId, productId);
  }

  @Get('exchange-rate')
  getExchangeRate() {
    return this.ecommerceService.getExchangeRate();
  }

  @Get('categories')
  findAllCategories(@Headers('x-tenant-id') tenantId: string) {
    return this.ecommerceService.findAllCategories(tenantId);
  }

  @Post('categories')
  createCategory(
    @Headers('x-tenant-id') tenantId: string,
    @Body('name') name: string,
  ) {
    return this.ecommerceService.createCategory(tenantId, name);
  }

  @Get('orders')
  findAllOrders(@Headers('x-tenant-id') tenantId: string) {
    return this.ecommerceService.findAllOrders(tenantId);
  }

  @Post('orders')
  createOrder(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.ecommerceService.createOrder(tenantId, data);
  }

  @Get('orders/:id/invoice')
  async getInvoice(@Param('id') id: string, @Res() res: express.Response) {
    const pdfBuffer = await this.ecommerceService.generateInvoicePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=factura-${id.slice(0, 8)}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Get('reports/profitability')
  async getProfitabilityReport() {
    const tenantId = getTenantId();
    try {
      return await this.ecommerceService.getProfitabilityReport(tenantId);
    } catch (err) {
      console.error('Error in profitability report:', err);
      throw err;
    }
  }

  @Get('reports/stock-predictions')
  getStockPredictions() {
    const tenantId = getTenantId();
    return this.ecommerceService.getStockPredictions(tenantId);
  }

  @Get('reports/ai-insights')
  getAiInsights() {
    const tenantId = getTenantId();
    return this.ecommerceService.getAiInsights(tenantId);
  }

  @Get('dashboard/widgets')
  getDashboardWidgets(@Headers('x-tenant-id') tenantId: string) {
    return this.ecommerceService.getDashboardWidgets(tenantId);
  }
}
