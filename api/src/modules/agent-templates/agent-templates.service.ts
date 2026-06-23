import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AgentTemplatesService {
  constructor(private prisma: DatabaseService) {}

  async findAll() {
    return this.prisma.mysql.agentTemplate.findMany();
  }

  // Add more CRUD methods as needed
}


