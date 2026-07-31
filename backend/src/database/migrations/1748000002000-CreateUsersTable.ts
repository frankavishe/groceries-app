import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1748000002000 implements MigrationInterface {
  name = 'CreateUsersTable1748000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(120) NOT NULL,
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        email VARCHAR(150) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'CUSTOMER',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
