import { Module } from '@nestjs/common';
import { AgentTemplatesService } from './agent-templates.service';
import { AgentTemplatesController } from './agent-templates.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { AgentRegistryBootstrapService } from './agent-registry-bootstrap.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AgentTemplatesController],
  providers: [AgentTemplatesService, AgentRegistryBootstrapService],
})
export class AgentTemplatesModule {}
