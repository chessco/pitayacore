import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { WorkersService } from './workers.service';

@Controller('operations/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  async getWorkers() {
    return this.workersService.findAll();
  }

  @Get(':id')
  async getWorker(@Param('id') id: string) {
    return this.workersService.findOne(id);
  }

  @Post()
  async createWorker(@Body() data: any) {
    return this.workersService.create(data);
  }

  @Patch(':id')
  async updateWorker(@Param('id') id: string, @Body() data: any) {
    return this.workersService.update(id, data);
  }

  @Delete(':id')
  async deleteWorker(@Param('id') id: string) {
    return this.workersService.remove(id);
  }
}
