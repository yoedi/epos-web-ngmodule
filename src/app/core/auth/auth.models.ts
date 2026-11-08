export type Role = 'OWNER' | 'CASHIER';

/** Application model of the signed-in user. */
export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
}

/** `user` object as returned by POST /auth/login and GET /auth/me. */
export interface UserDto {
  id: number;
  name: string;
  username: string;
  role: Role;
}

/** Response of POST /auth/login (docs/api-spec.md section 1). */
export interface LoginResponseDto {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserDto;
}

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    name: dto.name,
    username: dto.username,
    role: dto.role,
  };
}

/** Request body of POST /auth/login. */
export interface LoginRequestDto {
  username: string;
  password: string;
}
