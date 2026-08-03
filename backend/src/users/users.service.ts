import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

// Minimal service scoped to what the delivery module (specs/delivery) needs:
// looking up a candidate agent by id/role and listing active agents for the
// admin-web assignment dropdown. The full CRUD/role-management module in
// specs/users (GET /users, PATCH /users/:id/role, etc.) is still unbuilt and
// deliberately out of scope here — this is not that module.
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findActiveDeliveryAgents(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DELIVERY_AGENT, isActive: true },
      order: { fullName: 'ASC' },
    });
  }
}
