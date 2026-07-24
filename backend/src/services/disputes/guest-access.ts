import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError } from '../../utils/errors';
import bcrypt from 'bcrypt';

export async function createGuestAccount(
  email: string,
  displayName: string
): Promise<any> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const tempPassword = crypto.randomUUID().slice(0, 16);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      accountType: 'GUEST',
      emailVerified: false,
    },
  });

  logger.info('Guest account created', { userId: user.id, email });

  return { user, tempPassword };
}

export async function convertGuestToStandard(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.accountType !== 'GUEST') {
    throw new ValidationError('User is not a guest account');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      accountType: 'STANDARD',
      emailVerified: true,
    },
  });

  logger.info('Guest account converted to standard', { userId });
}
