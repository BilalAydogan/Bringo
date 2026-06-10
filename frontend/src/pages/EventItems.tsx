import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import type { Item } from '../types/item';
import { ArrowLeft, Plus, Trash2, Check, Loader2, Package, Users } from 'lucide-react';

type Assignment = {
  id?: string;
  user_id: string;
  quantity: number;
  status?: 'assigned' | 'completed' | 'cancelled';
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export default function EventItems() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Item[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingAssignments, setEditingAssignments] = useState<string | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, Assignment[]>>({});

  useEffect(() => {
    if (!id) return;

    axiosInstance
      .get(`/events/${id}/items`)
      .then((response) => setItems(response.data.data ?? []))
      .catch((err) => setError(err.response?.data?.error?.message || 'Malzemeler yüklenemedi.'))
      .finally(() => setLoading(false));

    axiosInstance
      .get('/events/joined')
      .then((response) => {
        const joined = response.data.data ?? [];
        const users = joined.flatMap((event: any) => [
          {
            id: event.created_by.id,
            firstName: event.created_by.firstName ?? event.created_by.email.split('@')[0],
            lastName: event.created_by.lastName ?? '',
            email: event.created_by.email,
          },
          ...(event.participants ?? []).map((p: any) => ({
            id: p.user.id,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
            email: p.user.email,
          })),
        ]);
        setAllUsers(users);
      })
      .catch(() => {});
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newItemName.trim() || !newItemQuantity) return;

    setCreating(true);
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
      setCreating(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Bu malzemeyi silmek istediğinize emin misiniz?')) return;

    setProcessingId(itemId);
    try {
      await axiosInstance.delete(`/events/${id}/items/${itemId}`);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Malzeme silinemedi.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (itemId: string) => {
    if (!id) return;

    setProcessingId(itemId);
    try {
      const response = await axiosInstance.post(`/events/${id}/items/${itemId}/complete`);
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? response.data.data : item)),
      );
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Malzeme tamamlanamadı.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveAssignments = async (itemId: string, assignments: Assignment[]) => {
    setProcessingId(itemId);
    try {
      const response = await axiosInstance.post(`/events/${id}/items/${itemId}/assign`, {
        assignments: assignments.map((a) => ({ user_id: a.user_id, quantity: a.quantity })),
      });

      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? response.data.data : item)),
      );
      setEditingAssignments(null);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Atamalar kaydedilemedi.');
    } finally {
      setProcessingId(null);
    }
  };

  const startEditingAssignments = (item: Item) => {
    const existing: Assignment[] = (item.assignments ?? []).map((a) => ({
      id: a.id,
      user_id: a.user?.id ?? '',
      quantity: a.quantity,
      status: a.status,
      user: a.user,
    }));

    if (existing.length === 0) {
      existing.push({ user_id: '', quantity: 1 });
    }

    setAssignmentDrafts((prev) => ({ ...prev, [item.id]: existing }));
    setEditingAssignments(item.id);
  };

  const updateDraft = (itemId: string, index: number, patch: Partial<Assignment>) => {
    setAssignmentDrafts((prev) => {
      const draft = [...(prev[itemId] ?? [])];
      draft[index] = { ...draft[index], ...patch } as Assignment;
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

  const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'assigned');
  const completedItems = items.filter((i) => i.status === 'completed');

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Etkinlik Detayı
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">Malzemeler</h2>
            <p className="text-neutral-400">Etkinliğe getirilecek malzemeleri yönetin</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-8">
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
              disabled={creating || !newItemName.trim() || !newItemQuantity}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all disabled:opacity-70"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Ekle
            </button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Bekleyen Malzemeler ({pendingItems.length})</h3>
              {pendingItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-8 text-center">
                  <Package className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
                  <p className="text-neutral-400">Henüz malzeme eklenmedi.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingItems.map((item) => {
                    const isEditing = editingAssignments === item.id;
                    const draft = assignmentDrafts[item.id] ?? [];

                    return (
                      <div key={item.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">{item.name}</p>
                            {item.target_quantity !== null && (
                              <p className="text-xs text-neutral-400 mt-1">
                                Hedef: {item.target_quantity} adet | Atanan: {item.total_assigned ?? 0} adet
                              </p>
                            )}
                            {item.assignments && item.assignments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {item.assignments.map((assignment) => (
                                  <div key={assignment.id} className="flex items-center gap-2 text-xs text-neutral-400">
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
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {!isEditing ? (
                              <>
                                <button
                                  onClick={() => startEditingAssignments(item)}
                                  className="px-3 py-2 rounded-xl text-xs font-medium bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-colors"
                                >
                                  Atama Yap
                                </button>
                                <button
                                  onClick={() => handleComplete(item.id)}
                                  disabled={processingId === item.id}
                                  className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-60"
                                  title="Tamamla"
                                >
                                  {processingId === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  disabled={processingId === item.id}
                                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-60"
                                  title="Sil"
                                >
                                  {processingId === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  handleSaveAssignments(
                                    item.id,
                                    draft.filter((a) => a.user_id),
                                  )
                                }
                                disabled={processingId === item.id}
                                className="px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-60"
                              >
                                Kaydet
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-4 space-y-2">
                            {draft.map((assignment, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <select
                                  value={assignment.user_id}
                                  onChange={(e) => updateDraft(item.id, index, { user_id: e.target.value })}
                                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                >
                                  <option value="">Kişi seçin...</option>
                                  {allUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.firstName} {u.lastName} ({u.email})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min={1}
                                  value={assignment.quantity}
                                  onChange={(e) =>
                                    updateDraft(item.id, index, { quantity: Math.max(1, parseInt(e.target.value || '1', 10)) })
                                  }
                                  className="w-20 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500/50"
                                />
                                <button
                                  onClick={() => removeDraftRow(item.id, index)}
                                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
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

            {completedItems.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-neutral-400">Tamamlananlar ({completedItems.length})</h3>
                <div className="space-y-2">
                  {completedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-4 opacity-75"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-300 line-through">{item.name}</p>
                        {item.assignments && item.assignments.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {item.assignments.map((a) => (
                              <p key={a.id} className="text-xs text-neutral-500">
                                {a.user?.firstName} {a.user?.lastName} x{a.quantity}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
