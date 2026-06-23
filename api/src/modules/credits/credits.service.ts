import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class CreditsService {
  constructor(private prisma: DatabaseService) {}

  async findAll() {
    return this.prisma.mysql.creditWallet.findMany();
  }

  // Add more CRUD methods as needed
}
