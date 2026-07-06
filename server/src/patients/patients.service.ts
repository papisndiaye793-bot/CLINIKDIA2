import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.patient.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const p = await this.prisma.patient.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Patient introuvable.');
    return p;
  }

  create(data: { code: string; nom: string; prenom: string; [k: string]: unknown }) {
    return this.prisma.patient.create({ data: data as never });
  }

  update(id: string, data: Record<string, unknown>) {
    return this.prisma.patient.update({ where: { id }, data: data as never });
  }

  remove(id: string) {
    return this.prisma.patient.delete({ where: { id } });
  }
}
