import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { AlertRuleType } from '../alert-matchers';

const RULE_TYPES: AlertRuleType[] = [
  'MENTION_SPIKE',
  'NEGATIVE_SENTIMENT',
  'EMERGING_TOPIC',
  'COMMENT_VOLUME',
  'CRITICAL_KEYWORDS',
];

const ALERT_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

export class CreateAlertRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(RULE_TYPES)
  type: AlertRuleType;

  /** Type-specific configuration, e.g. { keywords: [...] } or { windowMinutes, threshold }. */
  @IsObject()
  @IsOptional()
  params?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateAlertRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  params?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateAlertStatusDto {
  @IsIn(ALERT_STATUSES)
  status: string;
}
