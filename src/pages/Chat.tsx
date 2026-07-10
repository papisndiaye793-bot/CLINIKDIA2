import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Hash, Search, Users2, Plus, Settings, Trash2, Lock, Pencil,
  Bold, Italic, Strikethrough, Code, Link2, Smile, Paperclip, SmilePlus, MessageSquarePlus,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { Card, PageHeader, EmptyState, Modal, Button, Field, Input, Textarea, ConfirmDialog } from '@/components/ui';
import { cn, initials } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { ChatMessage, Channel } from '@/types';

const QUICK_REACTIONS = ['👍', '❤️', '😄', '🎉', '✅', '🙏'];
const EMOJIS = ['😀', '😁', '😂', '🤣', '😊', '😍', '😎', '😉', '👍', '👏', '🙏', '🎉', '✅', '❌', '⚠️', '❤️', '🔥', '💪', '🩺', '💉', '🧪', '📋', '📅', '⏰'];

const dmId = (ids: string[]) => 'dm:' + [...ids].sort().join('_');
const participantsOf = (channel: string) => (channel.startsWith('dm:') ? channel.slice(3).split('_') : []);
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayKey = (iso: string) => iso.slice(0, 10);
const dayLabel = (iso: string, todayLbl: string, yesterdayLbl: string, locale: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (dayKey(iso) === today) return todayLbl;
  if (dayKey(iso) === y.toISOString().slice(0, 10)) return yesterdayLbl;
  return new Date(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
};

function RichText({ text }: { text: string }) {
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|~~[^~]+~~|`[^`]+`|https?:\/\/[^\s]+)/g;
  const out: React.ReactNode[] = [];
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('~~')) out.push(<span key={k++} className="line-through">{t.slice(2, -2)}</span>);
    else if (t.startsWith('`')) out.push(<code key={k++} className="rounded bg-slate-200/70 px-1 py-0.5 text-[12.5px] text-slate-700">{t.slice(1, -1)}</code>);
    else if (t.startsWith('*')) out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    else out.push(<a key={k++} href={t} target="_blank" rel="noreferrer" className="text-brand-600 underline">{t}</a>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{out}</span>;
}

export default function Chat() {
  const { channels, chatMessages, sendMessage, toggleReaction, addChannel, updateChannel, deleteChannel, users } = useStore();
  const { user } = useAuth();
  const { t, lang } = useT();
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  const me = user?.id ?? '';

  const [channel, setChannel] = useState('general');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [channelForm, setChannelForm] = useState<{ mode: 'create' | 'edit'; data: Channel | null } | null>(null);
  const [delChannel, setDelChannel] = useState<Channel | null>(null);
  const [newDisc, setNewDisc] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const others = users.filter((u) => u.id !== me);
  const userName = (id: string) => { const u = users.find((x) => x.id === id); return u ? `${u.prenom} ${u.nom}` : 'Utilisateur'; };
  const userById = (id: string) => users.find((x) => x.id === id);

  const isDM = channel.startsWith('dm:');
  const parts = participantsOf(channel);
  const otherParts = parts.filter((id) => id !== me);
  const isGroup = isDM && parts.length > 2;
  const dmUser = isDM && parts.length === 2 ? userById(otherParts[0]) : undefined;

  const channelMessages = useMemo(() => chatMessages.filter((m) => m.channel === channel), [chatMessages, channel]);
  const visible = useMemo(
    () => (search ? channelMessages.filter((m) => m.text.toLowerCase().includes(search.toLowerCase())) : channelMessages),
    [channelMessages, search]
  );

  const lastByChannel = useMemo(() => {
    const map: Record<string, string> = {};
    chatMessages.forEach((m) => { if (!map[m.channel] || m.timestamp > map[m.channel]) map[m.channel] = m.timestamp; });
    return map;
  }, [chatMessages]);

  // Discussions de groupe existantes (où je participe)
  const groupDms = useMemo(() => {
    const map = new Map<string, string[]>();
    chatMessages.forEach((m) => {
      if (m.channel.startsWith('dm:')) {
        const ps = participantsOf(m.channel);
        if (ps.length > 2 && ps.includes(me)) map.set(m.channel, ps);
      }
    });
    if (isGroup && !map.has(channel)) map.set(channel, parts);
    return [...map.entries()];
  }, [chatMessages, channel, isGroup, parts, me]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [visible.length, channel]);

  const send = () => { if (!text.trim()) return; sendMessage(text, channel); setText(''); setShowEmoji(false); };
  const surround = (before: string, after = before) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = text.slice(s, e) || 'texte';
    setText(text.slice(0, s) + before + sel + after + text.slice(e));
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length; });
  };
  const insert = (str: string) => {
    const ta = taRef.current; if (!ta) { setText((t) => t + str); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    setText(text.slice(0, s) + str + text.slice(e));
    requestAnimationFrame(() => { ta.focus(); const p = s + str.length; ta.selectionStart = ta.selectionEnd = p; });
  };

  // Lignes (séparateurs de jour + regroupement par auteur)
  const rows: { m: ChatMessage; newDay: boolean; showHeader: boolean }[] = [];
  let prev: ChatMessage | null = null;
  visible.forEach((m) => {
    const newDay = !prev || dayKey(prev.timestamp) !== dayKey(m.timestamp);
    const grouped = !!prev && prev.authorId === m.authorId && !newDay && new Date(m.timestamp).getTime() - new Date(prev.timestamp).getTime() < 5 * 60000;
    rows.push({ m, newDay, showHeader: !grouped });
    prev = m;
  });

  const currentChannel = channels.find((c) => c.id === channel);
  const headerTitle = isDM ? (isGroup ? otherParts.map(userName).join(', ') : `${dmUser?.prenom ?? ''} ${dmUser?.nom ?? ''}`) : currentChannel?.label ?? channel;
  const headerDesc = isDM ? (isGroup ? `${t('ch.group')} · ${parts.length} ${t('ch.members')}` : dmUser?.actif ? t('ch.online') : t('ch.offline')) : currentChannel?.description ?? '';

  const startDiscussion = (ids: string[]) => {
    if (ids.length === 0) return;
    setChannel(dmId([me, ...ids]));
    setSearch('');
    setNewDisc(false);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('nav.chat')} subtitle={t('ch.subtitle')} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Barre latérale */}
        <Card className="hidden min-h-0 flex-col lg:flex">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-slate-800">ClinikDia</div>
              <div className="text-[11px] text-slate-400">{t('ch.workspace')}</div>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Users2 size={15} /></span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* Canaux */}
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('ch.channels')}</span>
              <button title={t('ch.createChannel')} onClick={() => setChannelForm({ mode: 'create', data: null })} className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Plus size={14} /></button>
            </div>
            {channels.map((c) => {
              const active = c.id === channel;
              return (
                <button key={c.id} onClick={() => { setChannel(c.id); setSearch(''); }}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition', active ? 'bg-brand-600 font-medium text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  <Hash size={16} className={active ? 'text-white/80' : 'text-slate-400'} />
                  <span className="truncate">{c.label}</span>
                  {lastByChannel[c.id] && !active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-400" />}
                </button>
              );
            })}

            {/* Messages directs */}
            <div className="flex items-center justify-between px-2 pb-1 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('ch.dms')}</span>
              <button title={t('ch.newDisc')} onClick={() => setNewDisc(true)} className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-brand-600"><Plus size={14} /></button>
            </div>
            {others.map((u) => {
              const id = dmId([me, u.id]);
              const active = id === channel;
              return (
                <button key={u.id} onClick={() => { setChannel(id); setSearch(''); }}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition', active ? 'bg-brand-600 font-medium text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  <span className="relative">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded text-[9px] font-semibold', active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600')}>{initials(u.nom, u.prenom)}</span>
                    <span className={cn('absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2', active ? 'ring-brand-600' : 'ring-white', u.actif ? 'bg-emerald-500' : 'bg-slate-300')} />
                  </span>
                  <span className="truncate">{u.prenom} {u.nom}</span>
                </button>
              );
            })}
            {groupDms.map(([id, ps]) => {
              const active = id === channel;
              const names = ps.filter((x) => x !== me).map((x) => userById(x)?.prenom ?? '?').join(', ');
              return (
                <button key={id} onClick={() => { setChannel(id); setSearch(''); }}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition', active ? 'bg-brand-600 font-medium text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded', active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600')}><Users2 size={12} /></span>
                  <span className="truncate">{names}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Conversation */}
        <Card className="flex min-h-0 flex-col lg:col-span-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2.5">
              {isDM ? (
                <span className="relative">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{isGroup ? <Users2 size={16} /> : dmUser ? initials(dmUser.nom, dmUser.prenom) : '?'}</span>
                  {!isGroup && <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white', dmUser?.actif ? 'bg-emerald-500' : 'bg-slate-300')} />}
                </span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Hash size={18} /></span>
              )}
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  {!isDM && <Hash size={15} className="text-slate-400" />}{headerTitle}
                  {isDM && <Lock size={12} className="text-slate-300" />}
                </div>
                <div className="text-xs text-slate-400">{headerDesc}{!isDM && ` · ${users.length} ${t('ch.members')}`}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('common.search')}…`}
                  className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white" />
              </div>
              {!isDM && currentChannel && (
                <button title={t('ch.channelSettings')} onClick={() => setChannelForm({ mode: 'edit', data: currentChannel })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                  <Settings size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {visible.length === 0 ? (
              <EmptyState icon={<Hash size={22} />} title={search ? t('ch.noResult') : t('ch.noMessages')} hint={search ? t('ch.noResultHint') : t('ch.noMessagesHint')} />
            ) : (
              rows.map(({ m, newDay, showHeader }) => (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-3 flex items-center gap-3">
                      <span className="h-px flex-1 bg-slate-100" />
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-medium capitalize text-slate-500">{dayLabel(m.timestamp, t('ch.today'), t('ch.yesterday'), locale)}</span>
                      <span className="h-px flex-1 bg-slate-100" />
                    </div>
                  )}
                  <MessageRow m={m} showHeader={showHeader} meId={me} onReact={(e) => toggleReaction(m.id, e)} />
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Composeur */}
          <div className="p-3">
            <div className="rounded-xl border border-slate-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
              <div className="flex items-center gap-0.5 border-b border-slate-100 px-2 py-1.5">
                <TbBtn title={t('ch.bold')} onClick={() => surround('**')}><Bold size={15} /></TbBtn>
                <TbBtn title={t('ch.italic')} onClick={() => surround('*')}><Italic size={15} /></TbBtn>
                <TbBtn title={t('ch.strike')} onClick={() => surround('~~')}><Strikethrough size={15} /></TbBtn>
                <TbBtn title={t('ch.code')} onClick={() => surround('`')}><Code size={15} /></TbBtn>
                <TbBtn title={t('ch.link')} onClick={() => surround('[', '](url)')}><Link2 size={15} /></TbBtn>
              </div>
              <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={2} placeholder={isDM ? `${t('ch.msgTo')} ${headerTitle}…` : `${t('ch.msgIn')} #${headerTitle}…`}
                className="block w-full resize-none bg-transparent px-3 py-2 text-sm outline-none" />
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="relative flex items-center gap-0.5">
                  <TbBtn title={t('ch.emoji')} onClick={() => setShowEmoji((s) => !s)}><Smile size={16} /></TbBtn>
                  <TbBtn title={t('ch.attach')}><Paperclip size={16} /></TbBtn>
                  {showEmoji && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
                      <div className="absolute bottom-9 left-0 z-20 grid w-full max-w-[16rem] grid-cols-8 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                        {EMOJIS.map((e) => <button key={e} onClick={() => { insert(e); setShowEmoji(false); }} className="rounded p-1 text-lg hover:bg-slate-100">{e}</button>)}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={send} disabled={!text.trim()} className="flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-40">
                  <Send size={15} /> {t('ch.send')}
                </button>
              </div>
            </div>
            <div className="mt-1 px-1 text-[11px] text-slate-400">{t('ch.composerHint')}</div>
          </div>
        </Card>
      </div>

      {/* Modale canal (créer / modifier) */}
      {channelForm && (
        <ChannelFormModal
          mode={channelForm.mode}
          channel={channelForm.data}
          canDelete={channels.length > 1}
          onClose={() => setChannelForm(null)}
          onSave={(label, description) => {
            if (channelForm.mode === 'edit' && channelForm.data) {
              updateChannel(channelForm.data.id, { label, description });
            } else {
              const id = addChannel(label, description);
              setChannel(id);
            }
            setChannelForm(null);
          }}
          onDelete={() => { if (channelForm.data) { setDelChannel(channelForm.data); setChannelForm(null); } }}
        />
      )}

      <ConfirmDialog
        open={!!delChannel}
        title={t('ch.deleteChannel')}
        message={<span className="font-semibold text-slate-700">#{delChannel?.label}</span>}
        onConfirm={() => {
          if (delChannel) {
            deleteChannel(delChannel.id);
            if (channel === delChannel.id) setChannel('general');
          }
        }}
        onClose={() => setDelChannel(null)}
      />

      {/* Nouvelle discussion */}
      {newDisc && (
        <NewDiscussionModal
          users={others}
          onClose={() => setNewDisc(false)}
          onStart={startDiscussion}
        />
      )}
    </div>
  );
}

function TbBtn({ title, onClick, children }: { title: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">{children}</button>
  );
}

function MessageRow({ m, showHeader, meId, onReact }: { m: ChatMessage; showHeader: boolean; meId: string; onReact: (emoji: string) => void }) {
  const { t } = useT();
  const reactions = Object.entries(m.reactions ?? {});
  return (
    <div className="group relative flex gap-2.5 rounded-lg px-2 py-0.5 hover:bg-slate-50">
      <div className="w-9 shrink-0 pt-0.5">
        {showHeader ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-[11px] font-semibold text-brand-700">{m.authorName.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
        ) : (
          <span className="block pt-1 text-right text-[10px] text-slate-400 opacity-0 group-hover:opacity-100">{fmtTime(m.timestamp)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-800">{m.authorId === meId ? t('ch.you') : m.authorName}</span>
            <span className="text-[11px] text-slate-400">{fmtTime(m.timestamp)}</span>
          </div>
        )}
        <div className="text-sm leading-relaxed text-slate-700"><RichText text={m.text} /></div>
        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map(([emoji, ids]) => {
              const mine = ids.includes(meId);
              return (
                <button key={emoji} onClick={() => onReact(emoji)} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition', mine ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                  <span>{emoji}</span><span className="font-medium">{ids.length}</span>
                </button>
              );
            })}
            <ReactPicker onReact={onReact} />
          </div>
        )}
      </div>
      <div className="absolute right-2 top-0 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm group-hover:flex">
        {QUICK_REACTIONS.map((e) => <button key={e} onClick={() => onReact(e)} title={`${t('ch.react')} ${e}`} className="rounded p-1 text-sm hover:bg-slate-100">{e}</button>)}
      </div>
    </div>
  );
}

function ReactPicker({ onReact }: { onReact: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-slate-50"><SmilePlus size={13} /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-7 left-0 z-20 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {QUICK_REACTIONS.map((e) => <button key={e} onClick={() => { onReact(e); setOpen(false); }} className="rounded p-1 text-base hover:bg-slate-100">{e}</button>)}
          </div>
        </>
      )}
    </div>
  );
}

function ChannelFormModal({
  mode, channel, canDelete, onClose, onSave, onDelete,
}: {
  mode: 'create' | 'edit';
  channel: Channel | null;
  canDelete: boolean;
  onClose: () => void;
  onSave: (label: string, description: string) => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const [label, setLabel] = useState(channel?.label ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'edit' ? t('ch.channelSettings') : t('ch.createChannel')}
      footer={
        <>
          {mode === 'edit' && (
            <Button variant="danger" onClick={onDelete} disabled={!canDelete}><Trash2 size={16} /> {t('common.delete')}</Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => label.trim() && onSave(label, description)}>
            {mode === 'edit' ? <><Pencil size={16} /> {t('common.save')}</> : <><Plus size={16} /> {t('co.create')}</>}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('ch.channelName')}>
          <div className="relative">
            <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('ch.channelNamePh')} className="pl-8" />
          </div>
        </Field>
        <Field label={t('ch.channelDesc')}><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('ch.channelDescPh')} /></Field>
      </div>
    </Modal>
  );
}

function NewDiscussionModal({
  users, onClose, onStart,
}: {
  users: { id: string; prenom: string; nom: string; actif: boolean }[];
  onClose: () => void;
  onStart: (ids: string[]) => void;
}) {
  const { t } = useT();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const filtered = users.filter((u) => `${u.prenom} ${u.nom}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Modal
      open
      onClose={onClose}
      title={t('ch.newDisc')}
      footer={
        <>
          <span className="mr-auto text-sm text-slate-400">{selected.length} {t('ch.selected')}</span>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => onStart(selected)} disabled={selected.length === 0}>
            <MessageSquarePlus size={16} /> {selected.length > 1 ? t('ch.startGroup') : t('ch.start')}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-500">{t('ch.choosePeople')}</p>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t('ch.searchColleague')}…`} className="pl-8" />
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {filtered.map((u) => {
          const checked = selected.includes(u.id);
          return (
            <button key={u.id} onClick={() => toggle(u.id)} className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition', checked ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
              <span className="relative">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(u.nom, u.prenom)}</span>
                <span className={cn('absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white', u.actif ? 'bg-emerald-500' : 'bg-slate-300')} />
              </span>
              <span className="flex-1 text-sm font-medium text-slate-700">{u.prenom} {u.nom}</span>
              <span className={cn('flex h-5 w-5 items-center justify-center rounded border', checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>
                {checked && <span className="text-xs">✓</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
