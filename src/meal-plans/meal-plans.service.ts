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

  async getWeekPlan(weekStart: string, userId?: number): Promise<MealPlan | null> {
    return this.repo.findOneBy({ weekStart, userId: userId ?? null });
  }

  async saveWeekPlan(
    weekStart: string,
    plan: Record<string, Record<string, number | null>>,
    userId?: number,
  ): Promise<MealPlan> {
    const existing = await this.repo.findOneBy({ weekStart, userId: userId ?? null });
    if (existing) {
      existing.plan = plan;
      return this.repo.save(existing);
    }
    return this.repo.save({ weekStart, plan, userId: userId ?? null });
  }
}
