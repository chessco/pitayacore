export class AgentTemplateMetadataDto {
  capabilities?: string[];
  recommendedSkills?: string[];
  allowedProviders?: string[];
  defaultTemperature?: number;
  tags?: string[];
}

export class CreateAgentTemplateDto {
  name: string;
  slug: string;
  description?: string;
  systemPrompt?: string;
  avatar?: string;
  category?: string;
  defaultModel?: string;
  status?: string;
  metadata?: AgentTemplateMetadataDto;
}

export class UpdateAgentTemplateDto {
  name?: string;
  description?: string;
  systemPrompt?: string;
  avatar?: string;
  category?: string;
  defaultModel?: string;
  status?: string;
  metadata?: AgentTemplateMetadataDto;
}
