import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable1748000003000
  implements MigrationInterface
{
  name = 'CreateCategoriesTable1748000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon_url TEXT,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE categories`);
  }
}
