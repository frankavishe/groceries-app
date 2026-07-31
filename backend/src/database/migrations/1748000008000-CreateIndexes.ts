import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexes1748000008000 implements MigrationInterface {
  name = 'CreateIndexes1748000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX idx_products_category ON products(category_id)`,
    );
    await queryRunner.query(`CREATE INDEX idx_orders_user ON orders(user_id)`);
    await queryRunner.query(
      `CREATE INDEX idx_payments_order ON payment_transactions(order_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_payments_reference ON payment_transactions(reference_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_payments_reference`);
    await queryRunner.query(`DROP INDEX idx_payments_order`);
    await queryRunner.query(`DROP INDEX idx_orders_user`);
    await queryRunner.query(`DROP INDEX idx_products_category`);
  }
}
