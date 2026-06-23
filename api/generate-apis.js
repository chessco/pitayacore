const fs = require('fs');
const path = require('path');

const modules = [
  {
    name: 'assets',
    className: 'Assets',
    singleName: 'asset'
  },
  {
    name: 'characters',
    className: 'Characters',
    singleName: 'character'
  },
  {
    name: 'agent-templates',
    className: 'AgentTemplates',
    singleName: 'agentTemplate'
  },
  {
    name: 'credits',
    className: 'Credits',
    singleName: 'creditWallet'
  }
];

modules.forEach(m => {
  const dirPath = path.join(__dirname, 'src/modules', m.name);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const servicePath = path.join(dirPath, `${m.name}.service.ts`);
  const controllerPath = path.join(dirPath, `${m.name}.controller.ts`);
  const modulePath = path.join(dirPath, `${m.name}.module.ts`);

  const serviceCode = `import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ${m.className}Service {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.${m.singleName}.findMany();
  }

  // Add more CRUD methods as needed
}
`;

  const controllerCode = `import { Controller, Get } from '@nestjs/common';
import { ${m.className}Service } from './${m.name}.service';

@Controller('api/${m.name}')
export class ${m.className}Controller {
  constructor(private readonly ${m.name.replace('-', '')}Service: ${m.className}Service) {}

  @Get()
  findAll() {
    return this.${m.name.replace('-', '')}Service.findAll();
  }
}
`;

  const moduleCode = `import { Module } from '@nestjs/common';
import { ${m.className}Service } from './${m.name}.service';
import { ${m.className}Controller } from './${m.name}.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [${m.className}Controller],
  providers: [${m.className}Service],
})
export class ${m.className}Module {}
`;

  fs.writeFileSync(servicePath, serviceCode);
  fs.writeFileSync(controllerPath, controllerCode);
  fs.writeFileSync(modulePath, moduleCode);
});

console.log('Done!');
