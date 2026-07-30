import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type SocialConnectorAccount } from '@prisma/mysql-client';
import { DatabaseService } from '../../../common/database/database.service';
import { TokenCryptoService } from './crypto/token-crypto.service';
import { ConnectorRegistry } from './connector-registry.service';
import { CreateConnectorDto, UpdateConnectorDto } from './dto/connector.dto';

/**
 * CRUD for connector accounts. Access tokens are AES-256-GCM encrypted on write
 * and NEVER returned to clients (stripped from every response).
 */
@Injectable()
export class ConnectorAccountsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly crypto: TokenCryptoService,
    private readonly registry: ConnectorRegistry,
  ) {}

  /** Remove the token from an account row before returning it. */
  private redact(account: SocialConnectorAccount) {
    const { accessToken, ...safe } = account;
    return { ...safe, hasToken: Boolean(accessToken) };
  }

  async create(tenantId: string, dto: CreateConnectorDto) {
    // Fail fast if the provider has no connector implementation yet.
    this.registry.get(dto.provider);

    const account = await this.db.mysql.socialConnectorAccount.create({
      data: {
        tenantId,
        provider: dto.provider,
        externalAccountId: dto.externalAccountId,
        name: dto.name,
        accessToken: this.crypto.encrypt(dto.accessToken),
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue,
      },
    });
    return this.redact(account);
  }

  async findAll(tenantId: string) {
    const accounts = await this.db.mysql.socialConnectorAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((a) => this.redact(a));
  }

  async findOne(tenantId: string, id: string) {
    const account = await this.db.mysql.socialConnectorAccount.findFirst({
      where: { id, tenantId },
    });
    if (!account) throw new NotFoundException('Connector account not found');
    return this.redact(account);
  }

  /** Internal use only — returns the row WITH the encrypted token. */
  async getRawOrThrow(tenantId: string, id: string) {
    const account = await this.db.mysql.socialConnectorAccount.findFirst({
      where: { id, tenantId },
    });
    if (!account) throw new NotFoundException('Connector account not found');
    return account;
  }

  async update(tenantId: string, id: string, dto: UpdateConnectorDto) {
    await this.getRawOrThrow(tenantId, id);
    const data: Prisma.SocialConnectorAccountUpdateInput = {
      name: dto.name,
      status: dto.status,
      metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue,
    };
    if (dto.accessToken) {
      data.accessToken = this.crypto.encrypt(dto.accessToken);
    }
    const account = await this.db.mysql.socialConnectorAccount.update({
      where: { id },
      data,
    });
    return this.redact(account);
  }

  async remove(tenantId: string, id: string) {
    await this.getRawOrThrow(tenantId, id);
    await this.db.mysql.socialConnectorAccount.delete({ where: { id } });
    return { deleted: true };
  }
}
