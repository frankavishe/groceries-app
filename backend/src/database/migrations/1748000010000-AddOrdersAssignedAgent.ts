import { MigrationInterface, QueryRunner } from 'typeorm';

// specs/delivery/design.md "Schema Addition" — the delivery module's own
// migration, added when M7 starts (per its note to keep the base schema a
// faithful match to the spec PDF until this point).
export class AddOrdersAssignedAgent1748000010000 implements MigrationInterface {
  name = 'AddOrdersAssignedAgent1748000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE orders ADD COLUMN assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN assigned_agent_id`);
  }
}
