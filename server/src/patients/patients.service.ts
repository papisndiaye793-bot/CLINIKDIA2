import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// SQLite ne supporte pas le type Json : ces champs sont stockés en JSON sérialisé.
// L'API expose et accepte des OBJETS ; la (dé)sérialisation se fait ici.
const JSON_FIELDS = ['serologies', 'antecedents', 'contactUrgence', 'prisesEnCharge'] as const;

function serialize(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const f of JSON_FIELDS) {
    if (out[f] !== undefined && out[f] !== null && typeof out[f] !== 'string') {
      out[f] = JSON.stringify(out[f]);
    }
  }
  return out;
}

function deserialize<T extends Record<string, unknown> | null>(p: T): T {
  if (!p) return p;
  const out: Record<string, unknown> = { ...p };
  for (const f of JSON_FIELDS) {
    if (typeof out[f] === 'string') {
      try {
        out[f] = JSON.parse(out[f] as string);
      } catch {
        /* laisser tel quel si non-JSON */
      }
    }
  }
  return out as T;
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.patient.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => deserialize(r as Record<string, unknown>));
  }

  async get(id: string) {
    const p = await this.prisma.patient.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Patient introuvable.');
    return deserialize(p as Record<string, unknown>);
  }

  async create(data: { code?: string; nom: string; prenom: string; [k: string]: unknown }) {
    // Génère un code unique PAT-xxxx si absent
    if (!data.code) {
      const count = await this.prisma.patient.count();
      let n = count + 1;
      let code = `PAT-${String(n).padStart(4, '0')}`;
      while (await this.prisma.patient.findUnique({ where: { code } })) {
        n += 1;
        code = `PAT-${String(n).padStart(4, '0')}`;
      }
      data.code = code;
    }
    const created = await this.prisma.patient.create({ data: serialize(data) as never });
    return deserialize(created as Record<string, unknown>);
  }

  async update(id: string, data: Record<string, unknown>) {
    const updated = await this.prisma.patient.update({ where: { id }, data: serialize(data) as never });
    return deserialize(updated as Record<string, unknown>);
  }

  remove(id: string) {
    return this.prisma.patient.delete({ where: { id } });
  }
}
