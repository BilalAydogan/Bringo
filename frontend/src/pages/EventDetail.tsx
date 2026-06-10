import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { formatEventDate } from '../utils/date';
import type { Event } from '../types/event';
import type { Item } from '../types/item';
import { ArrowLeft, Calendar, MapPin, Pencil, Trash2, Loader2, Copy, Check, Package, Users, Plus, X } from 'lucide-react';

const itemStatusMeta: Record<Item['status'], { label: string; className: string }> = {
  pending: {
    label: 'Bekliyor',
    className: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  },
  assigned: {
    label: 'Atandı',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
};

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemDetailsId, setEditingItemDetailsId] = useState<string | null>(null);
  const [itemDetailDraft, setItemDetailDraft] = useState({ name: '', target_quantity: '' });
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, { user_id: string; quantity: number }[]>>({});
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'participants' | 'items'>('participants');

  useEffect(() => {
    if (!id) return;

    Promise.all([
      axiosInstance.get(`/events/${id}`),
      axiosInstance.get(`/events/${id}/items`),
    ])
      .then(([eventRes, itemsRes]) => {
        setEvent(eventRes.data.data);
        setItems(itemsRes.data.data ?? []);
      })
      .catch((err) => setError(err.response?.data?.error?.message || 'Etkinlik yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !window.confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;

    setDeleting(true);
    try {
      await axiosInstance.delete(`/events/${id}`);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Silme işlemi başarısız.');
      setDeleting(false);
    }
  };

  const handleGetInvite = async () => {
    if (!id) return;

    try {
      const response = await axiosInstance.get(`/events/${id}/invite`);
      const url = `${window.location.origin}/events/join/${response.data.data.code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Davet kodu alınamadı.');
    }
  };

  const handleLeaveEvent = async () => {
    if (!id || !window.confirm('Bu etkinlikten ayrılmak istediğinize emin misiniz? Size atanmış malzemeler de kaldırılacak.')) return;

    setLeaving(true);
    try {
      await axiosInstance.post(`/events/${id}/leave`);
      window.location.href = '/';
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Etkinlikten ayrılamadınız.');
      setLeaving(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newItemName.trim() || !newItemQuantity) return;

    setCreatingItem(true);
    try {
      const response = await axiosInstance.post(`/events/${id}/items`, {
        name: newItemName.trim(),
        target_quantity: parseInt(newItemQuantity, 10),
      });
      setItems((prev) => [response.data.data, ...prev]);
      setNewItemName('');
      setNewItemQuantity('');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Malzeme eklenemedi.');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Bu malzemeyi silmek istediğinize emin misiniz?')) return;

    setProcessingItemId(itemId);
    try {
      await axiosInstance.delete(`/events/${id}/items/${itemId}`);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Malzeme silinemedi.');
    } finally {
      setProcessingItemId(null);
    }
  };

  const startEditingItemDetails = (item: Item) => {
    setEditingItemId(null);
    setEditingItemDetailsId(item.id);
    setItemDetailDraft({
      name: item.name,
      target_quantity: item.target_quantity?.toString() ?? '',
    });
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!id || !itemDetailDraft.name.trim() || !itemDetailDraft.target_quantity) return;

    setProcessingItemId(itemId);
    try {
      const response = await axiosInstance.put(`/events/${id}/items/${itemId}`, {
        name: itemDetailDraft.name.trim(),
        target_quantity: parseInt(itemDetailDraft.target_quantity, 10),
      });

      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? response.data.data : item)),
      );
      setEditingItemDetailsId(null);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Malzeme güncellenemedi.');
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    if (!id) return;

    setProcessingItemId(itemId);
    try {
      const response = await axiosInstance.post(`/events/${id}/items/${itemId}/complete`);

      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? response.data.data : item)),
      );
      setEditingItemId(null);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Malzeme tamamlanamadı.');
    } finally {
      setProcessingItemId(null);
    }
  };

  const startEditingAssignments = (item: Item) => {
    const existing = (item.assignments ?? []).map((a) => ({
      user_id: a.user?.id ?? '',
      quantity: a.quantity,
    }));

    if (existing.length === 0) {
      existing.push({ user_id: '', quantity: 1 });
    }

    setAssignmentDrafts((prev) => ({ ...prev, [item.id]: existing }));
    setEditingItemId(item.id);
  };

  const updateDraft = (itemId: string, index: number, patch: { user_id?: string; quantity?: number }) => {
    setAssignmentDrafts((prev) => {
      const draft = [...(prev[itemId] ?? [])];
      draft[index] = { ...draft[index], ...patch };
      return { ...prev, [itemId]: draft };
    });
  };

  const addDraftRow = (itemId: string) => {
    setAssignmentDrafts((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] ?? []), { user_id: '', quantity: 1 }],
    }));
  };

  const removeDraftRow = (itemId: string, index: number) => {
    setAssignmentDrafts((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveAssignments = async (itemId: string) => {
    const draft = assignmentDrafts[itemId] ?? [];
    const validAssignments = draft.filter((a) => a.user_id);

    const item = items.find((i) => i.id === itemId);
    if (item?.target_quantity) {
      const total = validAssignments.reduce((sum, a) => sum + (a.quantity || 0), 0);
      if (total > item.target_quantity) {
        alert(`Toplam atama miktarı (${total}), hedef miktarı (${item.target_quantity}) aşıyor.`);
        return;
      }
    }

    setProcessingItemId(itemId);
    try {
      const response = await axiosInstance.post(`/events/${id}/items/${itemId}/assign`, {
        assignments: validAssignments,
      });

      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? response.data.data : item)),
      );
      setEditingItemId(null);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Atamalar kaydedilemedi.');
    } finally {
      setProcessingItemId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !event) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-24">
          <p className="text-red-400 mb-6">{error || 'Etkinlik bulunamadı.'}</p>
          <Link to="/" className="text-blue-400 hover:text-blue-300">Ana sayfaya dön</Link>
        </div>
      </AppLayout>
    );
  }

  const assignableUsers = [
    {
      id: event.created_by.id,
      firstName: event.created_by.email.split('@')[0],
      lastName: '',
      email: event.created_by.email,
    },
    ...(event.participants
      ?.filter((participant) => participant.status === 'accepted')
      .map((participant) => participant.user) ?? []),
  ].filter((user, index, users) => user.id && users.findIndex((candidate) => candidate.id === user.id) === index);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Etkinlikler
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
          <h2 className="text-3xl font-bold mb-6">{event.title}</h2>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 text-neutral-300">
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <span>{formatEventDate(event.date)}</span>
            </div>

            {event.location && (
              <div className="flex items-start gap-3 text-neutral-300">
                <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}

            {event.description && (
              <p className="text-neutral-400 leading-relaxed whitespace-pre-line pt-2 border-t border-neutral-800">
                {event.description}
              </p>
            )}
          </div>

          {!event.is_owner && !event.is_participant && (
            <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300">
              Bu etkinliğe katılmak için sahibinden davet kodu ile katılabilirsiniz.
            </div>
          )}

          {event.is_owner ? (
            <div className="grid gap-3 sm:grid-cols-3 mb-8">
              <Link
                to={`/events/${event.id}/edit`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Düzenle
              </Link>
              <button
                onClick={handleGetInvite}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Kopyalandı' : 'Davet Kodu'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors disabled:opacity-70"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          ) : !event.is_participant ? (
            <div className="mb-8">
              <Link
                to={`/events/join/${event.invite_code}`}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all"
              >
                Davet ile Katıl
              </Link>
            </div>
          ) : (
            <div className="mb-8 flex flex-col gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
              <span>Bu etkinliğe katılımcısınız.</span>
              <button
                type="button"
                onClick={handleLeaveEvent}
                disabled={leaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-60"
              >
                {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                {leaving ? 'Ayrılıyor...' : 'Etkinlikten Ayrıl'}
              </button>
            </div>
          )}

          <div className="border-t border-neutral-800 pt-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setDetailTab('participants')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  detailTab === 'participants' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Katılımcılar
              </button>
              <button
                onClick={() => setDetailTab('items')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  detailTab === 'items' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Malzemeler
              </button>
            </div>

            {detailTab === 'participants' && (
              <div>
                {event.participants && event.participants.length > 0 ? (
                  <div className="space-y-2">
                    {event.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {participant.user.firstName} {participant.user.lastName}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">{participant.user.email}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            participant.status === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : participant.status === 'rejected'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          }`}
                        >
                          {participant.status === 'accepted'
                            ? 'Kabul edildi'
                            : participant.status === 'rejected'
                              ? 'Reddedildi'
                              : 'Davet edildi'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-8 text-center">
                    <Users className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
                    <p className="text-neutral-400">Henüz katılımcı yok.</p>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'items' && (
              <div>
                {event.is_owner && (
                  <form onSubmit={handleCreateItem} className="mb-6">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Malzeme adı ekle..."
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                      <input
                        type="number"
                        min={1}
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        placeholder="Adet"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={creatingItem || !newItemName.trim() || !newItemQuantity}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all disabled:opacity-70"
                      >
                        {creatingItem ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Ekle
                      </button>
                    </div>
                  </form>
                )}

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-8 text-center">
                    <Package className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
                    <p className="text-neutral-400">Henüz malzeme eklenmedi.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const isEditingAssignments = editingItemId === item.id;
                      const isEditingDetails = editingItemDetailsId === item.id;
                      const statusMeta = itemStatusMeta[item.status];
                      const isProcessing = processingItemId === item.id;
                      const assignedToCurrentUser = item.assignments?.some((assignment) => (
                        (user?.id && assignment.user?.id === user.id) || assignment.user?.email === user?.email
                      )) ?? false;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 transition-colors ${
                            assignedToCurrentUser
                              ? 'border-amber-400/40 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                              : 'border-neutral-800 bg-neutral-900/70'
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              {isEditingDetails ? (
                                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
                                  <input
                                    type="text"
                                    value={itemDetailDraft.name}
                                    onChange={(e) =>
                                      setItemDetailDraft((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                    className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                  />
                                  <input
                                    type="number"
                                    min={1}
                                    value={itemDetailDraft.target_quantity}
                                    onChange={(e) =>
                                      setItemDetailDraft((prev) => ({ ...prev, target_quantity: e.target.value }))
                                    }
                                    className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className={`font-medium ${item.status === 'completed' ? 'text-neutral-300 line-through' : 'text-white'}`}>
                                      {item.name}
                                    </p>
                                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                    {assignedToCurrentUser && (
                                      <span className="px-2.5 py-1 rounded-lg border border-amber-400/30 bg-amber-400/10 text-xs font-medium text-amber-300">
                                        Size atandı
                                      </span>
                                    )}
                                  </div>
                                  {item.target_quantity !== null && (
                                    <p className="text-xs text-neutral-400 mt-1">
                                      Hedef: {item.target_quantity} adet | Atanan: {item.total_assigned ?? 0} adet
                                    </p>
                                  )}
                                  {item.assignments && item.assignments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {item.assignments.map((assignment) => (
                                        <div
                                          key={assignment.id}
                                          className={`flex flex-wrap items-center gap-2 rounded-lg px-2 py-1 text-xs ${
                                            (user?.id && assignment.user?.id === user.id) || assignment.user?.email === user?.email
                                              ? 'bg-amber-400/10 text-amber-200'
                                              : 'text-neutral-400'
                                          }`}
                                        >
                                          <Users className="w-3 h-3" />
                                          <span>
                                            {assignment.user?.firstName} {assignment.user?.lastName} x{assignment.quantity}
                                          </span>
                                          <span
                                            className={`px-2 py-0.5 rounded-md ${
                                              assignment.status === 'completed'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-neutral-800 text-neutral-300'
                                            }`}
                                          >
                                            {assignment.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">
                              {event.is_owner && !isEditingAssignments && !isEditingDetails && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditingItemDetails(item)}
                                    disabled={isProcessing}
                                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors disabled:opacity-60"
                                    title="Düzenle"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEditingAssignments(item)}
                                    disabled={item.status === 'completed' || isProcessing}
                                    className="px-3 py-2 rounded-xl text-xs font-medium bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-colors disabled:opacity-60"
                                  >
                                    Atama Yap
                                  </button>
                                  {item.status !== 'completed' && (
                                    <button
                                      type="button"
                                      onClick={() => handleCompleteItem(item.id)}
                                      disabled={isProcessing}
                                      className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-60"
                                      title="Tamamla"
                                    >
                                      {isProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id)}
                                    disabled={isProcessing}
                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-60"
                                    title="Sil"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </>
                              )}
                              {isEditingDetails && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemDetailsId(null)}
                                    disabled={isProcessing}
                                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors disabled:opacity-60"
                                    title="Vazgeç"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(item.id)}
                                    disabled={isProcessing || !itemDetailDraft.name.trim() || !itemDetailDraft.target_quantity}
                                    className="px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-60"
                                  >
                                    Kaydet
                                  </button>
                                </>
                              )}
                              {isEditingAssignments && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    disabled={isProcessing}
                                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors disabled:opacity-60"
                                    title="Vazgeç"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveAssignments(item.id)}
                                    disabled={isProcessing}
                                    className="px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-60"
                                  >
                                    Kaydet
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {isEditingAssignments && (
                            <div className="mt-4 space-y-2">
                              {(assignmentDrafts[item.id] ?? []).map((assignment, index) => (
                                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_auto]">
                                  <select
                                    value={assignment.user_id}
                                    onChange={(e) => updateDraft(item.id, index, { user_id: e.target.value })}
                                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                  >
                                    <option value="">Kişi seçin...</option>
                                    {assignableUsers.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.email})
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min={1}
                                    value={assignment.quantity}
                                    onChange={(e) =>
                                      updateDraft(item.id, index, {
                                        quantity: Math.max(1, parseInt(e.target.value || '1', 10)),
                                      })
                                    }
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeDraftRow(item.id, index)}
                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addDraftRow(item.id)}
                                className="inline-flex items-center gap-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Kişi ekle
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
