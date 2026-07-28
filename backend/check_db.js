const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { initiator: true }
  });
  console.log(JSON.stringify(disputes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
