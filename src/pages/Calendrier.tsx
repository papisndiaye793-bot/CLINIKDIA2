import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplets, CalendarDays } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card, CardHeader, PageHeader, Badge, Button, EmptyState } from '@/components/ui';
import { fmtDateLong, todayISO } from '@/lib/utils';
import { useLabels } from '@/lib/labels';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function Calendrier() {
  const { seances, patients, machines } = useStore();
  const { t, lang } = useT();
  const L = useLabels();
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  const WEEKDAYS = lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthName = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string>(todayISO());

  // Comptage des séances par jour (clé yyyy-mm-dd)
  const countByDay = useMemo(() => {
    const map: Record<string, number> = {};
    seances.forEach((s) => {
      map[s.date] = (map[s.date] ?? 0) + 1;
    });
    return map;
  }, [seances]);

  // Construction de la grille du mois (semaines commençant lundi)
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startOffset = (first.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr: ({ date: string; day: number } | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push({ date, day: d });
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.m + delta;
      return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  };

  const daySeances = seances
    .filter((s) => s.date === selected)
    .sort((a, b) => a.creneau.localeCompare(b.creneau));

  const monthTotal = cells.reduce((a, c) => a + (c ? countByDay[c.date] ?? 0 : 0), 0);

  return (
    <div>
      <PageHeader title={t('nav.calendrier')} subtitle={t('ca.subtitle')} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></Button>
              <div className="min-w-[160px] text-center text-lg font-semibold capitalize text-slate-800">{monthName(cursor.y, cursor.m)}</div>
              <Button variant="outline" size="sm" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{monthTotal} {t('ca.monthSessions')}</span>
              <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); setSelected(todayISO()); }}>{t('pl.today')}</Button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-2 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-semibold uppercase text-slate-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((c, i) => {
                if (!c) return <div key={i} />;
                const count = countByDay[c.date] ?? 0;
                const isToday = c.date === todayISO();
                const isSelected = c.date === selected;
                return (
                  <button
                    key={c.date}
                    onClick={() => setSelected(c.date)}
                    className={cn(
                      'flex aspect-square flex-col items-center justify-start rounded-lg border p-1.5 text-sm transition-all',
                      isSelected ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/30' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50',
                    )}
                  >
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-brand-600 text-white' : 'text-slate-600')}>
                      {c.day}
                    </span>
                    {count > 0 && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-50 px-1.5 text-[10px] font-bold text-teal-700">
                        <Droplets size={10} /> {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('ca.dayDetail')} subtitle={fmtDateLong(selected)} />
          <div className="max-h-[28rem] overflow-y-auto p-4">
            {daySeances.length === 0 ? (
              <EmptyState icon={<CalendarDays size={22} />} title={t('ca.noSession')} hint={t('ca.noSessionHint')} />
            ) : (
              <div className="space-y-2">
                {daySeances.map((s) => {
                  const p = patients.find((x) => x.id === s.patientId);
                  const m = machines.find((x) => x.id === s.machineId);
                  const st = L.statutSeance[s.statut];
                  return (
                    <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <Droplets size={14} className="text-brand-500" /> {p?.prenom} {p?.nom}
                        </span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{L.creneauLabel[s.creneau]} · {m?.code}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
