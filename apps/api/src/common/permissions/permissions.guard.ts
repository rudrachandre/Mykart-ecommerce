import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { permissionsForRole } from './permissions';

/**
 * Permission-based authorization guard. Runs after JwtAuthGuard (which must
 * be present on the route) and complements — never replaces — RolesGuard.
 * Fails closed: unknown roles or a missing user are denied.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Routes without permission requirements remain governed by RolesGuard.
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const granted = permissionsForRole(user?.role);

    const missing = requiredPermissions.filter(
      (permission) => !granted.includes(permission as never),
    );

    if (missing.length > 0) {
      // Never echo the caller's role or the missing permission name pattern
      // beyond a generic message; keeps the guard non-enumerable.
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
