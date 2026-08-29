import { Role } from '@prisma/client';

/**
 * Granular permission model. Permissions are resolved from the user's role
 * via ROLE_PERMISSIONS — no database entities are involved, so this layer
 * never requires a schema change. Roles not present in the map (including
 * any future SUPPORT value once added to the Prisma enum) are denied
 * everything by default: fail closed.
 */
export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_ROLE_MANAGE: 'user:role-manage',

  PRODUCT_READ: 'product:read',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_MODERATE: 'product:moderate',

  ORDER_READ: 'order:read',
  ORDER_UPDATE: 'order:update',
  ORDER_CANCEL: 'order:cancel',
  ORDER_REFUND: 'order:refund',

  SELLER_READ: 'seller:read',
  SELLER_APPROVE: 'seller:approve',
  SELLER_SUSPEND: 'seller:suspend',

  INVENTORY_READ: 'inventory:read',
  INVENTORY_UPDATE: 'inventory:update',

  REVIEW_READ: 'review:read',
  REVIEW_MODERATE: 'review:moderate',

  COUPON_CREATE: 'coupon:create',
  COUPON_UPDATE: 'coupon:update',
  COUPON_DELETE: 'coupon:delete',

  ANALYTICS_READ: 'analytics:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const SELLER_PERMISSIONS: Permission[] = [
  PERMISSIONS.PRODUCT_READ,
  PERMISSIONS.PRODUCT_CREATE,
  PERMISSIONS.PRODUCT_UPDATE,
  PERMISSIONS.PRODUCT_DELETE,
  PERMISSIONS.ORDER_READ,
  PERMISSIONS.ORDER_UPDATE,
  PERMISSIONS.INVENTORY_READ,
  PERMISSIONS.INVENTORY_UPDATE,
  PERMISSIONS.SELLER_READ,
  PERMISSIONS.REVIEW_READ,
  PERMISSIONS.COUPON_CREATE,
  PERMISSIONS.COUPON_UPDATE,
  PERMISSIONS.COUPON_DELETE,
  PERMISSIONS.ANALYTICS_READ,
];

const SUPPORT_PERMISSIONS: Permission[] = [
  // Admin staff: read-only visibility, never management rights.
  PERMISSIONS.USER_READ,
  PERMISSIONS.PRODUCT_READ,
  PERMISSIONS.ORDER_READ,
  PERMISSIONS.SELLER_READ,
  PERMISSIONS.REVIEW_READ,
  PERMISSIONS.INVENTORY_READ,
  PERMISSIONS.ANALYTICS_READ,
];

const CUSTOMER_PERMISSIONS: Permission[] = [
  PERMISSIONS.PRODUCT_READ,
  PERMISSIONS.ORDER_READ,
  PERMISSIONS.REVIEW_READ,
];

/**
 * Role → permission resolution. CUSTOMER/SELLER/ADMIN exist in the Prisma
 * enum today. SUPPORT is declared here so the permission layer already
 * enforces least privilege the moment the role is added to the enum.
 */
export const ROLE_PERMISSIONS: Record<Role | 'SUPPORT', Permission[]> = {
  [Role.CUSTOMER]: CUSTOMER_PERMISSIONS,
  [Role.SELLER]: SELLER_PERMISSIONS,
  [Role.ADMIN]: ALL_PERMISSIONS,
  SUPPORT: SUPPORT_PERMISSIONS,
};

export function permissionsForRole(role: string | undefined): Permission[] {
  if (!role) {
    return [];
  }
  return ROLE_PERMISSIONS[role as Role | 'SUPPORT'] ?? [];
}
