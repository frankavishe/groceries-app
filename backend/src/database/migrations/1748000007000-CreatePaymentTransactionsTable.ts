import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTransactionsTable1748000007000 implements MigrationInterface {
  name = 'CreatePaymentTransactionsTable1748000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE payment_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
        provider payment_provider NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        reference_id VARCHAR(100) UNIQUE,
        checkout_request_id VARCHAR(150) UNIQUE,
        status payment_status DEFAULT 'INITIATED',
        response_payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE payment_transactions`);
  }
}
