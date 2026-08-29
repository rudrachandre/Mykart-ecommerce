import { SetMetadata } from '@nestjs/common';
import { Permission } from './permissions';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Declares the granular permissions required by a route. Must be used on a
 * route already guarded by JwtAuthGuard (the user must be authenticated
 * before permissions can be resolved) and PermissionsGuard.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
