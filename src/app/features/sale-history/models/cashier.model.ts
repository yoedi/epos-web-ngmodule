import { Role } from '../../../core/auth/auth.models';

/** Item of GET /users (docs/api-spec.md section 8). */
export interface UserListItemDto {
  id: number;
  name: string;
  username: string;
  role: Role;
  is_active: boolean;
}

/** A cashier as offered by the "Kasir" filter. */
export interface Cashier {
  id: number;
  name: string;
}

export function toCashier(dto: UserListItemDto): Cashier {
  return { id: dto.id, name: dto.name };
}
