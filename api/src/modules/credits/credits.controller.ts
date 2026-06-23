import { Controller, Get } from '@nestjs/common';
import { CreditsService } from './credits.service';

@Controller('api/credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  findAll() {
    return this.creditsService.findAll();
  }
}
