import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicRecipe } from './public-recipe.entity';

export interface AddToLibraryDto {
  url?: string | null;
  title: string;
  category?: string | null;
  ingredients?: object | null;
  data?: object | null;
  submittedByUserId?: number | null;
}

@Injectable()
export class PublicRecipesService {
  constructor(
    @InjectRepository(PublicRecipe)
    private readonly repo: Repository<PublicRecipe>,
  ) {}

  async findAll(opts: { limit: number; offset: number; search?: string }): Promise<{ recipes: PublicRecipe[]; total: number }> {
    const qb = this.repo.createQueryBuilder('r').orderBy('r.createdAt', 'DESC');
    if (opts.search) {
      qb.where('LOWER(r.title) LIKE :q OR LOWER(r.category) LIKE :q', {
        q: `%${opts.search.toLowerCase()}%`,
      });
    }
    const [recipes, total] = await qb.skip(opts.offset).take(opts.limit).getManyAndCount();
    return { recipes, total };
  }

  findById(id: number): Promise<PublicRecipe | null> {
    return this.repo.findOneBy({ id });
  }

  findByUrl(url: string): Promise<PublicRecipe | null> {
    return this.repo.findOneBy({ url });
  }

  async addToLibrary(dto: AddToLibraryDto): Promise<{ recipe: PublicRecipe; alreadyExisted: boolean }> {
    if (dto.url) {
      const existing = await this.repo.findOneBy({ url: dto.url });
      if (existing) return { recipe: existing, alreadyExisted: true };
    }
    const recipe = await this.repo.save({
      url: dto.url ?? null,
      title: dto.title,
      category: dto.category ?? null,
      ingredients: dto.ingredients ?? null,
      data: dto.data ?? null,
      submittedByUserId: dto.submittedByUserId ?? null,
    });
    return { recipe, alreadyExisted: false };
  }
}
