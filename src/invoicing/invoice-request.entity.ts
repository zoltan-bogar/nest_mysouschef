import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('invoice_requests')
export class InvoiceRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userEmail: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'done';

  @CreateDateColumn()
  requestedAt: Date;
}
