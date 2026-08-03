import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/transformers/numeric.transformer';

export enum PaymentProvider {
  MPESA = 'MPESA',
  MIXX_BY_YAS = 'MIXX_BY_YAS',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
}

// `PENDING` exists in the DB enum (src/database/migrations/1748000001000-CreateEnums.ts)
// for a provider that acks the push before resolving asynchronously, but no
// currently-implemented adapter's parseCallback ever produces it — Req 7-8
// only ever resolve a callback to SUCCESSFUL or FAILED.
export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'enum', enum: PaymentProvider, enumName: 'payment_provider' })
  provider: PaymentProvider;

  @Column({ name: 'phone_number', length: 15 })
  phoneNumber: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({
    name: 'reference_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  referenceId: string | null;

  @Column({
    name: 'checkout_request_id',
    type: 'varchar',
    length: 150,
    nullable: true,
    unique: true,
  })
  checkoutRequestId: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.INITIATED,
  })
  status: PaymentStatus;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
