import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderItemsTable1748000006000
  implements MigrationInterface
{
  name = 'CreateOrderItemsTable1748000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        unit_price NUMERIC(12, 2) NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        subtotal NUMERIC(12, 2) NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE order_items`);
  }
}
