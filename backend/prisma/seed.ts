import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminEmail = 'admin@meritview.app';
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      displayName: 'Admin User',
      emailVerified: true,
      accountType: 'ADMIN',
      marketingOptIn: false,
    },
  });

  console.log('✅ Admin user created:', admin.id);

  // Create test user
  const testEmail = 'test@meritview.app';
  const testPassword = await bcrypt.hash('test123', 12);

  const testUser = await prisma.user.upsert({
    where: { email: testEmail },
    update: {},
    create: {
      email: testEmail,
      passwordHash: testPassword,
      displayName: 'Test User',
      emailVerified: true,
      accountType: 'STANDARD',
      marketingOptIn: false,
    },
  });

  console.log('✅ Test user created:', testUser.id);

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });