import { MigrationInterface, QueryRunner } from 'typeorm';

// gen_random_uuid() is core in Postgres 13+ (our target: postgres:16); pgcrypto
// is created defensively here in case a deployment target is older/different.
export class CreateEnums1748000001000 implements MigrationInterface {
  name = 'CreateEnums1748000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(
      `CREATE TYPE user_role AS ENUM ('CUSTOMER', 'ADMIN', 'DELIVERY_AGENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE payment_provider AS ENUM ('MPESA', 'MIXX_BY_YAS', 'AIRTEL_MONEY')`,
    );
    await queryRunner.query(
      `CREATE TYPE payment_status AS ENUM ('INITIATED', 'PENDING', 'SUCCESSFUL', 'FAILED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE payment_status`);
    await queryRunner.query(`DROP TYPE payment_provider`);
    await queryRunner.query(`DROP TYPE order_status`);
    await queryRunner.query(`DROP TYPE user_role`);
  }
}
