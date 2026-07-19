import { IsIn } from 'class-validator';
import type { PlanKey } from '../plan.catalog';

export class SetPlanDto {
  @IsIn(['free', 'pro', 'enterprise'])
  plan!: PlanKey;
}
