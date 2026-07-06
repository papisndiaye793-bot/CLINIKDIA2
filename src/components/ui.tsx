import React from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { X, Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react';

// ─── Card ───────────────────────────────────────────────────────────────────
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Button ─────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const variants: Record<BtnVariant, string> = {
    primary:
      'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/30 hover:from-brand-600 hover:to-brand-700 focus-visible:ring-brand-500/40',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400/40',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400/40',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-600/30 hover:bg-red-700 focus-visible:ring-red-500/40',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-slate-400/40',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 outline-none focus-visible:ring-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── RowActions (Aperçu / Modifier / Supprimer) ─────────────────────────────
type ActionTone = 'view' | 'edit' | 'delete';
const actionStyles: Record<ActionTone, string> = {
  view: 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600',
  edit: 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600',
  delete: 'border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600',
};

export function ActionButton({
  tone,
  icon,
  label,
  onClick,
}: {
  tone: ActionTone;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-all duration-150 active:scale-95',
        actionStyles[tone]
      )}
    >
      {icon}
    </button>
  );
}

export function RowActions({
  onView,
  onEdit,
  onDelete,
  viewLabel,
  editLabel,
  deleteLabel,
  extra,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  extra?: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-end gap-1.5">
      {extra}
      {onView && <ActionButton tone="view" icon={<EyeIcon />} label={viewLabel ?? t('common.view')} onClick={onView} />}
      {onEdit && <ActionButton tone="edit" icon={<PencilIcon />} label={editLabel ?? t('common.edit')} onClick={onEdit} />}
      {onDelete && <ActionButton tone="delete" icon={<TrashIcon />} label={deleteLabel ?? t('common.delete')} onClick={onDelete} />}
    </div>
  );
}

function EyeIcon() {
  return <Eye size={15} />;
}
function PencilIcon() {
  return <Pencil size={15} />;
}
function TrashIcon() {
  return <Trash2 size={15} />;
}

// ─── ConfirmDialog ──────────────────────────────────────────────────────────
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <Trash2 size={16} /> {confirmLabel ?? t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Badge ──────────────────────────────────────────────────────────────────
const badgeTones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
};
export function Badge({ tone = 'slate', children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', badgeTones[tone])}>
      {children}
    </span>
  );
}

// ─── Inputs ─────────────────────────────────────────────────────────────────
export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, 'bg-white', props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, props.className)} />;
}

// ─── Modal ──────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className={cn('mt-10 w-full rounded-xl bg-white shadow-xl', sizes[size])}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ─── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── StatCard ───────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: keyof typeof statTones;
  hint?: string;
}) {
  return (
    <Card className="p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', statTones[tone])}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-800">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}
const statTones = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  teal: 'bg-teal-50 text-teal-600',
};

// ─── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div>
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Definition list (view modals) ──────────────────────────────────────────
export function DefList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-slate-100">{children}</dl>;
}
export function DefRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}

// ─── Table primitives ───────────────────────────────────────────────────────
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', className)}>
      {children}
    </th>
  );
}
export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn('whitespace-nowrap px-4 py-3 text-slate-700', className)}>{children}</td>;
}
