export enum Role {
  Admin = 1,
  User = 2,
  Manager = 3,
  Associer = 4,
  Employe = 5
}

export interface User {
  id: number;
  idUser: string;
  nameUser: string;
  surname: string;
  email: string;
  role: Role;
  gpn: string;
  profileImageUrl?: string;
  
  // Auth-related properties
  token?: string;
  emailVerified?: boolean;
  enabled?: boolean;
  passwordChangeRequired?: boolean;
  passwordResetToken?: string;
  verificationToken?: string;
}

export interface UserCreate {
  idUser: string;
  nameUser: string;
  surname: string;
  email: string;
  password: string;
  role: number;
  gpn: string;
  profileImage?: File;
}

export interface UserUpdate {
  id: number;
  idUser?: string;
  nameUser?: string;
  surname?: string;
  email?: string;
  role?: Role;
  enabled?: boolean;
  gpn?: string;
  password?: string;
  profileImage?: File;
}

export interface UserLogin {
  email: string;
  password: string;
}