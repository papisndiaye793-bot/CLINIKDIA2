import React from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { X, Eye, Pencil, Trash2, AlertTriangle } from 'lucide-react';

const cardBase = 'w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-card';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn(cardBase, className)}>{children}</section>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}) {
  const variants: Record<BtnVariant, string> = {
    primary:
      'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/30 hover:from-brand-600 hover:to-brand-700 focus-visible:ring-brand-500/40',
    secondary: '!border-slate-300 bg-slate-100 text-slate-800 shadow-sm hover:bg-slate-200 focus-visible:ring-slate-400/40',
    ghost: '!border-slate-200 bg-white/60 text-slate-700 hover:bg-slate-100 hover:!border-slate-300 focus-visible:ring-slate-400/40',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-600/30 hover:bg-red-700 focus-visible:ring-red-500/40',
    outline: '!border-brand-300 bg-white text-brand-700 shadow-sm hover:bg-brand-50 hover:!border-brand-400 focus-visible:ring-brand-400/40',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[1.75rem] border border-transparent font-semibold transition duration-200 ease-out outline-none focus-visible:ring-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
        fullWidth ? 'w-full justify-center' : 'min-w-[120px] sm:min-w-[140px]',
        size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 sm:px-5 py-3 text-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type ActionTone = 'view' | 'edit' | 'delete';
const actionStyles: Record<ActionTone, string> = {
  view: 'border-brand-200 bg-brand-50 text-brand-600 hover:border-brand-400 hover:bg-brand-100 hover:text-brand-700',
  edit: 'border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-700',
  delete: 'border-red-200 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100 hover:text-red-700',
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
        'inline-flex h-10 w-10 items-center justify-center rounded-[1.5rem] border shadow-sm transition duration-150 active:scale-95',
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
    <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
      {extra}
      {onView && <ActionButton tone="view" icon={<EyeIcon />} label={viewLabel ?? t('common.view')} onClick={onView} />}
      {onEdit && <ActionButton tone="edit" icon={<PencilIcon />} label={editLabel ?? t('common.edit')} onClick={onEdit} />}
      {onDelete && <ActionButton tone="delete" icon={<TrashIcon />} label={deleteLabel ?? t('common.delete')} onClick={onDelete} />}
    </div>
  );
}

function EyeIcon() {
  return <Eye size={16} />;
}
function PencilIcon() {
  return <Pencil size={16} />;
}
function TrashIcon() {
  return <Trash2 size={16} />;
}

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-red-50 text-red-600">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }} className="w-full sm:w-auto">
            <Trash2 size={16} /> {confirmLabel ?? t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ring-inset', badgeTones[tone])}>
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className={cn('block w-full', className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** Intertitre de section dans un formulaire long. */
export function FormSection({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn('col-span-full mt-2 flex items-center gap-3 first:mt-0', className)}>
      <span className="h-1 w-1 rounded-full bg-brand-500 ring-4 ring-brand-100" />
      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-700">{title}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, 'cursor-pointer bg-white', props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, 'min-h-[90px]', props.className)} />;
}

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
  // Fermeture au clavier (Échap)
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { md: 'max-w-3xl', lg: 'max-w-5xl', xl: 'max-w-6xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* En-tête et pied FIXES : les boutons d'action restent toujours visibles,
          seul le corps du formulaire défile. */}
      <div className={cn('flex max-h-[calc(100vh-3rem)] w-full max-w-[95vw] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5', sizes[size])}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
            <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="w-full rounded-[2rem] border border-slate-200/80 bg-white px-6 py-8 shadow-card">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
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
    <Card className="p-6 transition duration-200 hover:shadow-soft">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div>
        </div>
        <span className={cn('flex h-12 min-w-[48px] items-center justify-center rounded-3xl', statTones[tone])}>{icon}</span>
      </div>
      {hint && <div className="mt-4 text-sm text-slate-500">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-[2rem] border border-slate-200/80 bg-slate-50 p-10 text-center shadow-soft">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white text-slate-400 shadow-sm">{icon}</div>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-2 max-w-xl text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function DefList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-slate-200">{children}</dl>;
}

export function DefRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-700">{value}</dd>
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm">
      <table className={cn('min-w-full text-sm', className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('whitespace-nowrap px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn('whitespace-normal px-5 py-4 text-slate-700', className)}>
      {children}
    </td>
  );
}

