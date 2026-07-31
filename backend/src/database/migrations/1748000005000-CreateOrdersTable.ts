import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1748000005000 implements MigrationInterface {
  name = 'CreateOrdersTable1748000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        total_amount NUMERIC(12, 2) NOT NULL,
        delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
        status order_status DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE orders`);
  }
}
