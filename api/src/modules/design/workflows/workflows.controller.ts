import { Controller, Post, Body } from '@nestjs/common';
import {
  BrandIdentityWorkflow,
  BrandIdentityInput,
} from './brand-identity.workflow';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/workflows')
export class WorkflowsController {
  constructor(private readonly brandIdentityWorkflow: BrandIdentityWorkflow) {}

  /**
   * POST /design/workflows/brand-identity
   * Executes the Generate Brand Identity 9-step workflow.
   */
  @Post('brand-identity')
  async generateBrandIdentity(
    @Body()
    body: {
      brandId: string;
      brandName: string;
      industry: string;
      description: string;
      logo?: string;
      website?: string;
    },
  ) {
    const tenantId = getTenantId();

    const input: BrandIdentityInput = {
      tenantId,
      brandId: body.brandId,
      brandName: body.brandName,
      industry: body.industry,
      description: body.description,
      logo: body.logo,
      website: body.website,
    };

    return this.brandIdentityWorkflow.execute(input);
  }
}
