require('dotenv').config();

export const SUPER_ADMIN = process.env.SUPER_ADMIN || '';

/**
 * Check if user is Super Admin by keycloak UUID
 */
export function isSuperAdminByKeycloakId(userId: string): boolean {
  return Boolean(SUPER_ADMIN && userId === SUPER_ADMIN);
}
