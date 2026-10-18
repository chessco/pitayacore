import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ScriptsService } from './scripts.service';

@Controller('operations/scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Get()
  async getScripts() {
    return this.scriptsService.findAll();
  }

  @Get(':id')
  async getScript(@Param('id') id: string) {
    return this.scriptsService.findOne(id);
  }

  @Post()
  async createScript(@Body() data: any) {
    return this.scriptsService.create(data);
  }

  @Patch(':id')
  async updateScript(@Param('id') id: string, @Body() data: any) {
    return this.scriptsService.update(id, data);
  }
}
