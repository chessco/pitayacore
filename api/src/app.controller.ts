import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('system/status')
  getSystemStatus() {
    return {
      status: 'online',
      environment: process.env.NODE_ENV || 'development',
      flowApiUrl: process.env.FLOW_API_URL,
      pitayacoreApiUrl:
        process.env.PITAYACORE_API_URL || 'http://localhost:3014',
      database: 'connected', // Simplification
      timestamp: new Date().toISOString(),
    };
  }
}
