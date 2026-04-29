import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPlanTemplate } from './meal-plan-template.entity';

@Injectable()
export class MealPlanTemplatesService {
  constructor(
    @InjectRepository(MealPlanTemplate)
    private readonly repo: Repository<MealPlanTemplate>,
  ) {}

  findAll(userId: number): Promise<MealPlanTemplate[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  create(name: string, plan: Record<string, Record<string, number[]>>, userId: number): Promise<MealPlanTemplate> {
    return this.repo.save({ name, plan, userId });
  }

  async delete(id: number, userId: number): Promise<void> {
    const tpl = await this.repo.findOneBy({ id, userId });
    if (!tpl) throw new NotFoundException('Template not found.');
    await this.repo.delete(id);
  }
}
