import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards/public.decorator';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
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
