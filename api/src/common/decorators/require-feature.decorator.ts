import { SetMetadata } from '@nestjs/common';

export const RequireFeature = (featureName: string) =>
  SetMetadata('feature', featureName);
