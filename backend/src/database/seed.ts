import * as bcrypt from 'bcrypt';
import dataSource from './data-source';

interface IdRow {
  id: number;
}

const ADMIN = {
  fullName: 'Seed Admin',
  phoneNumber: '+255700000001',
  email: 'admin@groceries.local',
  password: 'ChangeMe123!',
};

// M7 delivery-agent view (specs/delivery) manual testing — register endpoint
// only ever creates CUSTOMER accounts, so a DELIVERY_AGENT needs seeding same
// as the admin.
const DELIVERY_AGENT = {
  fullName: 'Seed Delivery Agent',
  phoneNumber: '+255700000002',
  email: 'agent@groceries.local',
  password: 'ChangeMe123!',
};

const CATEGORIES = [
  { name: 'Fruits & Vegetables', iconUrl: null },
  { name: 'Dairy & Eggs', iconUrl: null },
  { name: 'Bakery', iconUrl: null },
  { name: 'Beverages', iconUrl: null },
  { name: 'Household & Cleaning', iconUrl: null },
];

const PRODUCTS: Array<{
  category: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stockQuantity: number;
}> = [
  {
    category: 'Fruits & Vegetables',
    name: 'Bananas',
    description: 'Fresh ripe bananas',
    price: 2500,
    unit: 'kg',
    stockQuantity: 40,
  },
  {
    category: 'Fruits & Vegetables',
    name: 'Tomatoes',
    description: 'Vine-ripened tomatoes',
    price: 3000,
    unit: 'kg',
    stockQuantity: 25,
  },
  {
    category: 'Fruits & Vegetables',
    name: 'Sukuma Wiki (Collard Greens)',
    description: 'Bunched collard greens',
    price: 500,
    unit: 'bunch',
    stockQuantity: 0, // out-of-stock example
  },
  {
    category: 'Dairy & Eggs',
    name: 'Fresh Milk 1L',
    description: 'Pasteurized whole milk',
    price: 3500,
    unit: 'liter',
    stockQuantity: 30,
  },
  {
    category: 'Dairy & Eggs',
    name: 'Eggs (Tray of 30)',
    description: 'Farm-fresh eggs, tray of 30',
    price: 12000,
    unit: 'tray',
    stockQuantity: 2, // low-stock example
  },
  {
    category: 'Dairy & Eggs',
    name: 'Cheddar Cheese 200g',
    description: 'Mild cheddar cheese block',
    price: 8500,
    unit: 'pack',
    stockQuantity: 15,
  },
  {
    category: 'Bakery',
    name: 'White Bread Loaf',
    description: 'Sliced white bread',
    price: 3200,
    unit: 'loaf',
    stockQuantity: 20,
  },
  {
    category: 'Bakery',
    name: 'Whole Wheat Bread',
    description: 'Sliced whole wheat bread',
    price: 3800,
    unit: 'loaf',
    stockQuantity: 10,
  },
  {
    category: 'Beverages',
    name: 'Bottled Water 1.5L',
    description: 'Still bottled water',
    price: 1500,
    unit: 'bottle',
    stockQuantity: 60,
  },
  {
    category: 'Beverages',
    name: 'Azam Juice 1L',
    description: 'Mixed fruit juice',
    price: 4500,
    unit: 'bottle',
    stockQuantity: 18,
  },
  {
    category: 'Household & Cleaning',
    name: 'Omo Detergent 1kg',
    description: 'Laundry detergent powder',
    price: 6500,
    unit: 'pack',
    stockQuantity: 22,
  },
  {
    category: 'Household & Cleaning',
    name: 'Toilet Paper (Pack of 4)',
    description: '2-ply toilet paper, pack of 4',
    price: 4000,
    unit: 'pack',
    stockQuantity: 35,
  },
];

async function seed() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // Admin user — phone_number is UNIQUE, so ON CONFLICT gives us idempotency directly.
    const passwordHash = await bcrypt.hash(ADMIN.password, 10);
    await queryRunner.query(
      `INSERT INTO users (full_name, phone_number, email, password_hash, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, 'ADMIN', TRUE, TRUE)
       ON CONFLICT (phone_number) DO NOTHING`,
      [ADMIN.fullName, ADMIN.phoneNumber, ADMIN.email, passwordHash],
    );
    console.log(`Seeded admin user (${ADMIN.phoneNumber})`);

    const agentPasswordHash = await bcrypt.hash(DELIVERY_AGENT.password, 10);
    await queryRunner.query(
      `INSERT INTO users (full_name, phone_number, email, password_hash, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, 'DELIVERY_AGENT', TRUE, TRUE)
       ON CONFLICT (phone_number) DO NOTHING`,
      [
        DELIVERY_AGENT.fullName,
        DELIVERY_AGENT.phoneNumber,
        DELIVERY_AGENT.email,
        agentPasswordHash,
      ],
    );
    console.log(`Seeded delivery agent user (${DELIVERY_AGENT.phoneNumber})`);

    // Categories/products have no unique constraint on `name` in the spec schema
    // (see specs/database/design.md), so idempotency is check-before-insert by name.
    const categoryIds = new Map<string, number>();
    for (const category of CATEGORIES) {
      const existing = (await queryRunner.query(
        `SELECT id FROM categories WHERE name = $1`,
        [category.name],
      )) as IdRow[];
      if (existing.length > 0) {
        categoryIds.set(category.name, existing[0].id);
        continue;
      }
      const inserted = (await queryRunner.query(
        `INSERT INTO categories (name, icon_url) VALUES ($1, $2) RETURNING id`,
        [category.name, category.iconUrl],
      )) as IdRow[];
      categoryIds.set(category.name, inserted[0].id);
    }
    console.log(`Seeded ${CATEGORIES.length} categories`);

    let productsInserted = 0;
    for (const product of PRODUCTS) {
      const existing = (await queryRunner.query(
        `SELECT id FROM products WHERE name = $1`,
        [product.name],
      )) as IdRow[];
      if (existing.length > 0) {
        continue;
      }
      await queryRunner.query(
        `INSERT INTO products (category_id, name, description, price, unit, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          categoryIds.get(product.category),
          product.name,
          product.description,
          product.price,
          product.unit,
          product.stockQuantity,
        ],
      );
      productsInserted++;
    }
    console.log(
      `Seeded ${productsInserted} new products (of ${PRODUCTS.length} defined)`,
    );
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed()
  .then(() => {
    console.log('Seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
