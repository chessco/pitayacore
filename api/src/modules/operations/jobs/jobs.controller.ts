import { Controller, Get, Post, Body } from '@nestjs/common';
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
}
