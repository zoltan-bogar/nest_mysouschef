import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async setTier(email: string, tier: User['tier']): Promise<User> {
    const user = await this.repo.findOneBy({ email });
    if (!user) throw new Error('User not found');
    user.tier = tier;
    return this.repo.save(user);
  }

  create(email: string, passwordHash: string): Promise<User> {
    return this.repo.save({ email, passwordHash });
  }

  async findOrCreate(email: string): Promise<User> {
    const existing = await this.repo.findOneBy({ email });
    if (existing) return existing;
    return this.repo.save({ email, passwordHash: '' });
  }

  async checkAndIncrementScan(userId: number): Promise<{ allowed: boolean; remaining: number | null }> {
    const user = await this.repo.findOneBy({ id: userId });
    if (!user) return { allowed: false, remaining: 0 };

    if (user.tier === 'expert') {
      user.scansUsedThisMonth += 1;
      await this.repo.save(user);
      return { allowed: true, remaining: null };
    }

    const now = new Date();
    const reset = user.scansResetAt ? new Date(user.scansResetAt) : null;
    const needsReset = !reset ||
      reset.getMonth() !== now.getMonth() ||
      reset.getFullYear() !== now.getFullYear();

    if (needsReset) {
      user.scansUsedThisMonth = 0;
      user.scansResetAt = now;
    }

    const PRO_CAP = 20;
    if (user.scansUsedThisMonth >= PRO_CAP) {
      if (needsReset) await this.repo.save(user);
      return { allowed: false, remaining: 0 };
    }

    user.scansUsedThisMonth += 1;
    await this.repo.save(user);
    return { allowed: true, remaining: PRO_CAP - user.scansUsedThisMonth };
  }
}
