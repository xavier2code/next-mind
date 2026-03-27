import { db } from '../src/lib/db/index.js';
import { users } from '../src/lib/db/schema.js';
import { hashPassword } from '../src/lib/password.js';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'test@nextmind.dev';
const TEST_PASSWORD = 'Test123456!';

async function seed() {
  console.log('Seeding test data...');

  // Check if test user already exists (idempotent)
  const existing = await db.query.users.findFirst({
    where: eq(users.email, TEST_EMAIL),
  });

  if (existing) {
    console.log('Test user already exists, skipping seed.');
    return;
  }

  // Create test user with hashed password
  const hashedPassword = await hashPassword(TEST_PASSWORD);

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: 'Test User',
    email: TEST_EMAIL,
    password: hashedPassword,
  });

  console.log('Test user created successfully.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
