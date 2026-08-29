import { ForbiddenException } from '@nestjs/common';
import { PERMISSIONS, permissionsForRole, ROLE_PERMISSIONS } from './permissions';
import { PermissionsGuard } from './permissions.guard';

const makeContext = (user: { role: string } | undefined) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  }) as never;

const makeReflector = (metadata: string[] | undefined) =>
  ({
    getAllAndOverride: () => metadata,
  }) as never;

describe('Permissions model & guard', () => {
  it('SUPPORT role receives read-only permissions only', () => {
    const perms = permissionsForRole('SUPPORT');
    expect(perms).toContain(PERMISSIONS.USER_READ);
    expect(perms).toContain(PERMISSIONS.ORDER_READ);
    expect(perms).toContain(PERMISSIONS.ANALYTICS_READ);
    // Management rights must never be granted to support staff.
    expect(perms).not.toContain(PERMISSIONS.USER_DELETE);
    expect(perms).not.toContain(PERMISSIONS.USER_ROLE_MANAGE);
    expect(perms).not.toContain(PERMISSIONS.ORDER_REFUND);
    expect(perms).not.toContain(PERMISSIONS.PRODUCT_MODERATE);
    expect(perms).not.toContain(PERMISSIONS.SELLER_SUSPEND);
  });

  it('unknown roles are denied everything (fail closed)', () => {
    expect(permissionsForRole('UNKNOWN_ROLE')).toEqual([]);
    expect(permissionsForRole(undefined)).toEqual([]);
  });

  it('SELLER cannot read users; ADMIN has every permission', () => {
    const seller = permissionsForRole('SELLER');
    expect(seller).not.toContain(PERMISSIONS.USER_READ);
    expect(seller).toContain(PERMISSIONS.INVENTORY_UPDATE);

    const admin = permissionsForRole('ADMIN');
    for (const permission of Object.values(PERMISSIONS)) {
      expect(admin).toContain(permission);
    }
  });

  it('guard denies when a required permission is missing', () => {
    const guard = new PermissionsGuard(makeReflector([PERMISSIONS.USER_READ]));
    expect(() =>
      guard.canActivate(makeContext({ role: 'SELLER' })),
    ).toThrow(ForbiddenException);
  });

  it('guard allows when all required permissions are granted', () => {
    const guard = new PermissionsGuard(
      makeReflector([PERMISSIONS.INVENTORY_UPDATE]),
    );
    expect(guard.canActivate(makeContext({ role: 'SELLER' }))).toBe(true);
  });

  it('guard fails closed for unauthenticated requests and unknown roles', () => {
    const guard = new PermissionsGuard(makeReflector([PERMISSIONS.USER_READ]));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(makeContext({ role: 'MYSTERY' }))).toThrow(
      ForbiddenException,
    );
  });

  it('guard is a no-op when no permission metadata exists', () => {
    const guard = new PermissionsGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext({ role: 'CUSTOMER' }))).toBe(true);
  });

  it('every declared role has a permission mapping', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(
      ['ADMIN', 'CUSTOMER', 'SELLER', 'SUPPORT'].sort(),
    );
  });
});
