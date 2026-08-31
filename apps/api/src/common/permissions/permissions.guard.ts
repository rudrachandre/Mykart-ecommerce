import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { permissionsForRole } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }

      const { user } = context.switchToHttp().getRequest();
      if (!user || !user.role) {
        throw new ForbiddenException('Insufficient permissions');
      }

      const granted = permissionsForRole(user.role);

      const missing = requiredPermissions.filter(
        (permission) => !granted.includes(permission as never),
      );

      if (missing.length > 0) {
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      return true;
    }
  }
}
