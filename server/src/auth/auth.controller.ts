import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { ChangePasswordDto, EnableMfaDto, LoginDto, RequestResetDto, ResetPasswordDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private cookieOpts() {
    const prod = process.env.NODE_ENV === 'production';
    // In development allow a more permissive SameSite to ease local testing.
    const sameSite = (prod ? 'strict' : 'lax') as 'strict' | 'lax';
    return { httpOnly: true, secure: prod, sameSite, maxAge: 30 * 60_000, path: '/' };
  }

  // Limite renforcée sur le login : 5 tentatives / minute (anti-force brute, 8.5)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto.email, dto.password, dto.totp);
    res.cookie('session', token, this.cookieOpts());
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('session', { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: AuthUser }) {
    return {
      id: req.user.sub,
      email: req.user.email,
      nom: req.user.nom,
      prenom: req.user.prenom,
      role: req.user.role,
      permissions: req.user.permissions ?? {},
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: Request & { user: AuthUser }, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.user.sub, dto.current, dto.next);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('request-reset')
  requestReset(@Body() dto: RequestResetDto) {
    return this.auth.requestReset(dto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.next);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  setupMfa(@Req() req: Request & { user: AuthUser }) {
    return this.auth.setupMfa(req.user.sub, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/confirm')
  confirmMfa(@Req() req: Request & { user: AuthUser }, @Body() dto: EnableMfaDto) {
    return this.auth.confirmMfa(req.user.sub, dto.totp, dto.enable ?? true);
  }
}
