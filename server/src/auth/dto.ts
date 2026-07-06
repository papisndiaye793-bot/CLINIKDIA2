import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Politique de mot de passe (ISO 27002 5.17) : >= 8, au moins une lettre et un chiffre.
const STRONG = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
  @IsOptional() @IsString() totp?: string; // code MFA si activé
}

export class ChangePasswordDto {
  @IsString() current!: string;
  @MinLength(8) @Matches(STRONG, { message: 'Mot de passe : 8+ caractères, au moins une lettre et un chiffre.' })
  next!: string;
}

export class RequestResetDto {
  @IsEmail() email!: string;
}

export class ResetPasswordDto {
  @IsString() token!: string;
  @MinLength(8) @Matches(STRONG, { message: 'Mot de passe : 8+ caractères, au moins une lettre et un chiffre.' })
  next!: string;
}

export class EnableMfaDto {
  @IsString() totp!: string;
  @IsBoolean() @IsOptional() enable?: boolean;
}
