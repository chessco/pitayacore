import { Controller, Get, Post, Body } from '@nestjs/common';
import { WorkersService } from './workers.service';

@Controller('operations/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  async getWorkers() {
    return this.workersService.findAll();
  }

  @Post()
  async createWorker(@Body() data: any) {
    return this.workersService.create(data);
  }
}
