export interface CurrentUserDto {
  userId: number;
  email: string;
  isAdmin: boolean;
  tokenVersion: number;

  firstname?: string;
  lastname?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
}

export interface MeResponse {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  isAdmin: boolean;
}