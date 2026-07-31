import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiException } from '../exceptions/api-exception';
import { UserRole } from '../../users/entities/user.entity';
import { RolesGuard } from './roles.guard';

function createContext(user?: { role: UserRole }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function createReflector(requiredRoles: UserRole[] | undefined): Reflector {
  return {
    getAllAndOverride: () => requiredRoles,
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows the request when the route has no @Roles() metadata', () => {
    const guard = new RolesGuard(createReflector(undefined));
    expect(guard.canActivate(createContext({ role: UserRole.CUSTOMER }))).toBe(
      true,
    );
  });

  it('allows the request when the user role is permitted', () => {
    const guard = new RolesGuard(createReflector([UserRole.ADMIN]));
    expect(guard.canActivate(createContext({ role: UserRole.ADMIN }))).toBe(
      true,
    );
  });

  it('rejects with 403 when the user role is not permitted', () => {
    const guard = new RolesGuard(createReflector([UserRole.ADMIN]));
    expect(() =>
      guard.canActivate(createContext({ role: UserRole.CUSTOMER })),
    ).toThrow(ApiException);
  });

  it('rejects with 403 when there is no authenticated user on the request', () => {
    const guard = new RolesGuard(createReflector([UserRole.ADMIN]));
    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ApiException,
    );
  });
});
