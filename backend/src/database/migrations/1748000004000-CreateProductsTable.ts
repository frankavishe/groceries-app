import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1748000004000 implements MigrationInterface {
  name = 'CreateProductsTable1748000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id INT REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
        unit VARCHAR(30) NOT NULL,
        stock_quantity INT NOT NULL DEFAULT 0,
        image_url TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE products`);
  }
}
