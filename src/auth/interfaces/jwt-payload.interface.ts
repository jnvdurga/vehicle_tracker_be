import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  phone: string;
  role: Role;
}
