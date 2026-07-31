import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  phone_number: string;
}
