import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('operations/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getJobs() {
    return this.jobsService.findAll();
  }

  @Post()
  async createJob(@Body() data: any) {
    return this.jobsService.create(data);
  }

  @Patch(':id')
  async updateJob(@Param('id') id: string, @Body() data: any) {
    return this.jobsService.update(id, data);
  }

  @Delete(':id')
  async deleteJob(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }
}
