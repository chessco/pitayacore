import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AssetsService {
  constructor(private prisma: DatabaseService) {}

  async findAll() {
    return this.prisma.mysql.asset.findMany();
  }

  // Add more CRUD methods as needed
}


