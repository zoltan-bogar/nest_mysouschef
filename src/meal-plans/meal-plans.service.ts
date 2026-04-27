import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPlan } from './meal-plan.entity';

@Injectable()
export class MealPlansService {
  constructor(
    @InjectRepository(MealPlan)
    private readonly repo: Repository<MealPlan>,
  ) {}

  async getWeekPlan(weekStart: string): Promise<MealPlan | null> {
    return this.repo.findOneBy({ weekStart });
  }

  async saveWeekPlan(
    weekStart: string,
    plan: Record<string, Record<string, number | null>>,
  ): Promise<MealPlan> {
    const existing = await this.repo.findOneBy({ weekStart });
    if (existing) {
      existing.plan = plan;
      return this.repo.save(existing);
    }
    return this.repo.save({ weekStart, plan });
  }
}
