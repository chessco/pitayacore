import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly ecommerceService: EcommerceService) {}

  @Get(':slug/products')
  async getPublicProducts(@Param('slug') slug: string) {
    return this.ecommerceService.findPublicProductsBySlug(slug);
  }

  @Get(':slug/categories')
  async getPublicCategories(@Param('slug') slug: string) {
    return this.ecommerceService.findPublicCategoriesBySlug(slug);
  }

  @Get('order/:orderId')
  async getOrderStatus(@Param('orderId') orderId: string) {
    return this.ecommerceService.getOrderStatus(orderId);
  }

  @Post(':slug/checkout')
  async createPublicOrder(@Param('slug') slug: string, @Body() data: any) {
    return this.ecommerceService.createPublicOrder(slug, data);
  }

  @Post(':slug/payment-intent')
  async createPaymentIntent(
    @Param('slug') slug: string,
    @Body('amount') amount: number,
  ) {
    return this.ecommerceService.createPaymentIntent(slug, amount);
  }
}
