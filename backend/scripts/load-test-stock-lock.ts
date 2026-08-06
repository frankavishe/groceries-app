/**
 * specs/hardening/design.md's Load Test section (Req 8-9).
 *
 * Standalone script (not a Jest test) that fires many concurrent
 * `POST /orders` against a REAL running dev server — a performance
 * characterization layered on top of test/orders.e2e-spec.ts's existing
 * 20-parallel *correctness* test, not a replacement for it. Seeds one
 * throwaway product + one throwaway customer directly via TypeORM (same
 * technique the e2e suite uses to skip the register/verify/login round
 * trip), signs a JWT with the real JWT_SECRET via a bare `JwtService`
 * instance (no full Nest app needed just to sign one token), then reports
 * throughput/latency and confirms zero overselling.
 *
 * Usage (from backend/): npm run load-test:stock-lock
 * Env overrides: LOAD_TEST_BASE_URL (default http://localhost:4000/api/v1),
 * LOAD_TEST_STOCK (default 50), LOAD_TEST_CONCURRENCY (default 200).
 */
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import dataSource from '../src/database/data-source';
import { Product } from '../src/products/entities/product.entity';
import { User, UserRole } from '../src/users/entities/user.entity';

const BASE_URL =
  process.env.LOAD_TEST_BASE_URL ?? 'http://localhost:4000/api/v1';
const STOCK = parseInt(process.env.LOAD_TEST_STOCK ?? '30', 10);
// Default kept under the global rate limiter's 120-req/60s-per-IP ceiling
// (app.module.ts) — every request in this script originates from one
// machine/IP, so anything above that would start mixing 429s into what's
// meant to be a stock-lock correctness/performance signal (409s only). Raise
// via LOAD_TEST_CONCURRENCY if testing against a multi-source setup or a
// deliberately raised throttle limit.
const CONCURRENCY = parseInt(process.env.LOAD_TEST_CONCURRENCY ?? '100', 10);

function percentile(sortedMs: number[], p: number): number {
  const index = Math.min(
    sortedMs.length - 1,
    Math.ceil((p / 100) * sortedMs.length) - 1,
  );
  return sortedMs[Math.max(0, index)];
}

async function main() {
  console.log(
    `Stock-lock load test: ${CONCURRENCY} concurrent requests against stock_quantity=${STOCK}, target ${BASE_URL}`,
  );

  await dataSource.initialize();
  const usersRepo = dataSource.getRepository(User);
  const productsRepo = dataSource.getRepository(Product);

  const phoneNumber = `+2557${Date.now().toString().slice(-9)}`;
  const user = await usersRepo.save(
    usersRepo.create({
      fullName: 'Load Test Customer',
      phoneNumber,
      passwordHash: await bcrypt.hash('LoadTest123!', 12),
      role: UserRole.CUSTOMER,
      isVerified: true,
      isActive: true,
    }),
  );
  const product = await productsRepo.save(
    productsRepo.create({
      name: `Load Test Product ${Date.now()}`,
      price: 1000,
      unit: 'pack',
      stockQuantity: STOCK,
      isAvailable: true,
    }),
  );

  const jwtService = new JwtService({
    secret: process.env.JWT_SECRET,
    signOptions: {
      expiresIn: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '86400', 10),
    },
  });
  const token = await jwtService.signAsync({
    sub: user.id,
    role: user.role,
    phone_number: user.phoneNumber,
  });

  let succeeded = 0;
  let rejected = 0;
  let otherStatuses = 0;
  const latenciesMs: number[] = [];

  const start = performance.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      const reqStart = performance.now();
      let status: number;
      try {
        const res = await fetch(`${BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: [{ product_id: product.id, quantity: 1 }],
          }),
        });
        status = res.status;
        await res.text(); // drain body
      } catch (error) {
        status = -1;
        console.error('Request failed:', error);
      }
      latenciesMs.push(performance.now() - reqStart);
      return status;
    }),
  );
  const totalMs = performance.now() - start;

  for (const status of results) {
    if (status === 201) succeeded++;
    else if (status === 409) rejected++;
    else otherStatuses++;
  }

  const finalProduct = await productsRepo.findOneByOrFail({ id: product.id });
  const sortedLatencies = [...latenciesMs].sort((a, b) => a - b);

  console.log('\n--- Results ---');
  console.log(`Total requests:      ${CONCURRENCY}`);
  console.log(`201 (succeeded):     ${succeeded}`);
  console.log(`409 (insufficient):  ${rejected}`);
  console.log(`Other status/error:  ${otherStatuses}`);
  console.log(`Final stock_quantity: ${finalProduct.stockQuantity}`);
  console.log(
    `Overselling check:   ${
      finalProduct.stockQuantity === STOCK - succeeded &&
      finalProduct.stockQuantity >= 0
        ? 'PASS (never oversold)'
        : 'FAIL'
    }`,
  );
  console.log(`\nWall clock:          ${totalMs.toFixed(0)}ms`);
  console.log(
    `Throughput:          ${(CONCURRENCY / (totalMs / 1000)).toFixed(1)} req/s`,
  );
  console.log(
    `Latency p50:         ${percentile(sortedLatencies, 50).toFixed(0)}ms`,
  );
  console.log(
    `Latency p95:         ${percentile(sortedLatencies, 95).toFixed(0)}ms`,
  );
  console.log(
    `Latency p99:         ${percentile(sortedLatencies, 99).toFixed(0)}ms`,
  );

  // Cleanup: this script's throwaway rows only, so repeated runs don't
  // accumulate noise in a shared dev/staging DB.
  await dataSource.query(`DELETE FROM order_items WHERE product_id = $1`, [
    product.id,
  ]);
  await dataSource.query(`DELETE FROM orders WHERE user_id = $1`, [user.id]);
  await productsRepo.delete({ id: product.id });
  await usersRepo.delete({ id: user.id });

  await dataSource.destroy();
}

void main();
