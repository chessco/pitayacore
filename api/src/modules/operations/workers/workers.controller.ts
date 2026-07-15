import { Controller, Get } from '@nestjs/common';
import { WorkersService } from './workers.service';

@Controller('operations/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  async getWorkers() {
    return this.workersService.findAll();
  }
}
