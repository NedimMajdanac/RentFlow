export interface CurrentUserDto {
  userId: number;
  email: string;
  isAdmin: boolean;
  tokenVersion: number;
}
