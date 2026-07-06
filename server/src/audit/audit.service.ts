import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Journal d'audit inviolable (ISO 27002 8.15).
 * Chaque entrée est chaînée : hash = sha256(prevHash + payload).
 * Modifier ou supprimer une ligne rompt la chaîne — détectable par `verify()`.
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  private payload(e: { userName: string; action: string; module: string; detail: string; createdAt: string }) {
    return `${e.createdAt}|${e.userName}|${e.action}|${e.module}|${e.detail}`;
  }

  async record(entry: { userId?: string; userName: string; action: string; module: string; detail: string }) {
    const last = await this.prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' } });
    const prevHash = last?.hash ?? 'GENESIS';
    const createdAt = new Date().toISOString();
    const hash = createHash('sha256')
      .update(prevHash + this.payload({ ...entry, createdAt }))
      .digest('hex');
    return this.prisma.auditLog.create({
      data: { ...entry, prevHash, hash },
    });
  }

  /** Vérifie l'intégrité de toute la chaîne d'audit. */
  async verify(): Promise<{ ok: boolean; brokenAt?: string }> {
    const logs = await this.prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
    let prev = 'GENESIS';
    for (const l of logs) {
      const expected = createHash('sha256')
        .update(prev + this.payload({ ...l, createdAt: l.createdAt.toISOString() }))
        .digest('hex');
      if (expected !== l.hash || l.prevHash !== prev) return { ok: false, brokenAt: l.id };
      prev = l.hash;
    }
    return { ok: true };
  }
}
