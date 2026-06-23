import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Headers,
} from '@nestjs/common';
import { HitlService } from './hitl.service';

@Controller('hitl')
export class HitlController {
  constructor(private readonly hitlService: HitlService) {}

  @Get('pending')
  async getPending() {
    return this.hitlService.getPendingActions();
  }

  @Post('intervene')
  async intervene(
    @Body()
    body: {
      messageId: string;
      level?: string;
      comments?: string;
      content?: string;
    },
  ) {
    return this.hitlService.createAction(
      body.messageId,
      body.level,
      body.comments,
      body.content,
    );
  }

  @Put(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { reviewerId: string; editedContent?: string },
  ) {
    return this.hitlService.approve(id, body.reviewerId, body.editedContent);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { reviewerId: string }) {
    return this.hitlService.reject(id, body.reviewerId);
  }
}
