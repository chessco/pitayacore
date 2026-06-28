import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class CreditsService {
  constructor(private prisma: DatabaseService) {}

  async findAll() {
    return this.prisma.mysql.creditWallet.findMany();
  }

  async getBalance(tenantId: string) {
    let wallet = await this.prisma.mysql.creditWallet.findUnique({
      where: { tenantId },
    });

    if (!wallet) {
      // Auto-create wallet with some initial balance if it doesn't exist
      wallet = await this.prisma.mysql.creditWallet.create({
        data: {
          tenantId,
          balance: 100, // Seed with 100 credits
        },
      });
    }
    return wallet;
  }

  async deductCredit(tenantId: string, amount: number, reason: string) {
    const wallet = await this.getBalance(tenantId);

    if (wallet.balance < amount) {
      throw new Error(
        `Insufficient credits. Required: ${amount}, Available: ${wallet.balance}`,
      );
    }

    // Use transaction to update balance and record transaction
    const [updatedWallet, transaction] = await this.prisma.mysql.$transaction([
      this.prisma.mysql.creditWallet.update({
        where: { tenantId },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.mysql.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          reason,
        },
      }),
    ]);

    return updatedWallet;
  }
}
