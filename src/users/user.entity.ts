import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: 'free' })
  tier: 'free' | 'pro' | 'expert' | 'admin';

  @Column({ default: 0 })
  scansUsedThisMonth: number;

  @Column({ type: 'timestamp', nullable: true })
  scansResetAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
