import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PatientsService } from './patients.service';
import { JwtAuthGuard, AuthUser } from '../common/jwt-auth.guard';
import { RbacGuard, RequirePerm } from '../common/rbac';
import { AuditService } from '../audit/audit.service';

// Toutes les routes exigent une session valide ET le bon droit côté serveur (8.3 / 8.5).
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('patients')
export class PatientsController {
  constructor(private patients: PatientsService, private audit: AuditService) {}

  private who(req: Request & { user: AuthUser }) {
    return { userId: req.user.sub, userName: req.user.email };
  }

  @RequirePerm('patients', 'access')
  @Get()
  list() {
    return this.patients.list();
  }

  @RequirePerm('patients', 'access')
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    // Traçabilité des accès en lecture aux dossiers patients (ISO 27799)
    await this.audit.record({ ...this.who(req), action: 'view', module: 'patients', detail: `Consultation patient ${id}` });
    return this.patients.get(id);
  }

  @RequirePerm('patients', 'write')
  @Post()
  async create(@Body() body: { code: string; nom: string; prenom: string }, @Req() req: Request & { user: AuthUser }) {
    const p = await this.patients.create(body);
    await this.audit.record({ ...this.who(req), action: 'create', module: 'patients', detail: `Patient créé ${p.code}` });
    return p;
  }

  @RequirePerm('patients', 'write')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() req: Request & { user: AuthUser }) {
    const p = await this.patients.update(id, body);
    await this.audit.record({ ...this.who(req), action: 'update', module: 'patients', detail: `Patient modifié ${id}` });
    return p;
  }

  @RequirePerm('patients', 'delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    await this.patients.remove(id);
    await this.audit.record({ ...this.who(req), action: 'delete', module: 'patients', detail: `Patient supprimé ${id}` });
    return { ok: true };
  }
}
