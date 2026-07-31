import { MigrationInterface, QueryRunner } from 'typeorm';

// issues.md ISSUE-007: not in the original spec PDF schema, needed for the
// OTP verification flow (specs/auth/design.md).
export class AddUsersIsVerified1748000009000 implements MigrationInterface {
  name = 'AddUsersIsVerified1748000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN is_verified`);
  }
}
