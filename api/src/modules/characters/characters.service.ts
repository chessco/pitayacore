import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class CharactersService {
  constructor(private prisma: DatabaseService) {}

  async findAll() {
    return this.prisma.mysql.character.findMany();
  }

  // Add more CRUD methods as needed
}


