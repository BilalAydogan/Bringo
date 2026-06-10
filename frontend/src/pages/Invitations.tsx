import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import type { Invitation } from '../types/event';
import { formatEventDate } from '../utils/date';
import { ArrowLeft, Calendar, Inbox, Loader2, Check, X } from 'lucide-react';

type InvitationSection = 'pending' | 'all';

export default function Invitations() {
  const [section, setSection] = useState<InvitationSection>('pending');
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvitations = async () => {
      setLoading(true);
      setError('');

      try {
        const response = section === 'pending'
          ? await axiosInstance.get('/events/invitations')
          : await axiosInstance.get('/events/joined');

        const data = section === 'pending'
          ? response.data.data
          : response.data.data.map((event: any) => ({
              id: event.id,
              status: 'accepted',
              event,
            }));

        setItems(data);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Davetler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [section]);

  const handleAccept = async (participantId: string) => {
    setProcessing(participantId);
    try {
      await axiosInstance.post(`/events/participants/${participantId}/accept`);
      setItems((prev) =>
        prev.map((item) =>
          item.id === participantId ? { ...item, status: 'accepted' } : item,
        ),
      );
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Davet kabul edilemedi.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (participantId: string) => {
    setProcessing(participantId);
    try {
      await axiosInstance.post(`/events/participants/${participantId}/reject`);
      setItems((prev) =>
        prev.map((item) =>
          item.id === participantId ? { ...item, status: 'rejected' } : item,
        ),
      );
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Davet reddedilemedi.');
    } finally {
      setProcessing(null);
    }
  };

  const displayed = items.filter((item) => {
    if (section === 'pending') {
      return item.status === 'invited';
    }
    return item.status === 'accepted';
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-24">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-24">
          <p className="text-red-400 mb-6">{error}</p>
          <Link to="/" className="text-blue-400 hover:text-blue-300">Ana sayfaya dön</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Etkinlikler
        </Link>

        <h2 className="text-3xl font-bold mb-2">Davetler</h2>
        <p className="text-neutral-400 mb-8">
          {section === 'pending' ? 'Bekleyen davetlerinizi görüntüleyin ve yönetin.' : 'Katıldığınız etkinlikler.'}
        </p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSection('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              section === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setSection('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              section === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            Katıldıklarım
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-12 text-center">
            <Inbox className="w-10 h-10 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400">Henüz bekleyen davetiniz yok.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{item.event.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-neutral-400">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatEventDate(item.event.date)}
                    </span>
                    {item.event.location && (
                      <span className="hidden sm:inline-flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-neutral-500" />
                        {item.event.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {section === 'pending' && item.status === 'invited' ? (
                    <>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={processing === item.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reddet
                      </button>
                      <button
                        onClick={() => handleAccept(item.id)}
                        disabled={processing === item.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
                      >
                        {processing === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Kabul et
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-3 py-2 rounded-xl text-xs font-medium ${
                        item.status === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {item.status === 'accepted' ? 'Kabul edildi' : 'Reddedildi'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
