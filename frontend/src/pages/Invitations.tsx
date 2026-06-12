import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import type { Invitation } from '../types/event';
import { formatEventDate } from '../utils/date';
import { ArrowLeft, Calendar, Inbox, Loader2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../utils/api';

type JoinedEventSummary = Invitation['event'];

type InvitationSection = 'pending' | 'all';

export default function Invitations() {
  const [section, setSection] = useState<InvitationSection>('pending');
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const fetchInvitations = async () => {
      setLoading(true);
      setError('');

      try {
        const response =
          section === 'pending'
            ? await axiosInstance.get('/events/invitations')
            : await axiosInstance.get('/events/joined');

        const data =
          section === 'pending'
            ? response.data.data
            : (response.data.data as JoinedEventSummary[]).map((event) => ({
                id: event.id,
                status: 'accepted',
                event,
              }));

        setItems(data);
      } catch (error: unknown) {
        setError(getApiErrorMessage(error, t('invitations.loadError')));
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [section, t]);

  const handleAccept = async (participantId: string) => {
    setProcessing(participantId);
    try {
      await axiosInstance.post(`/events/participants/${participantId}/accept`);
      setItems((prev) =>
        prev.map((item) => (item.id === participantId ? { ...item, status: 'accepted' } : item)),
      );
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, t('invitations.acceptError')));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (participantId: string) => {
    setProcessing(participantId);
    try {
      await axiosInstance.post(`/events/participants/${participantId}/reject`);
      setItems((prev) =>
        prev.map((item) => (item.id === participantId ? { ...item, status: 'rejected' } : item)),
      );
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, t('invitations.rejectError')));
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
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            {t('common.backToHome')}
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('joinEvent.back')}
        </Link>

        <h2 className="mb-2 text-2xl font-bold sm:text-3xl">{t('invitations.title')}</h2>
        <p className="text-neutral-400 mb-8">
          {section === 'pending' ? t('invitations.subtitlePending') : t('invitations.subtitleAll')}
        </p>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSection('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              section === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {t('invitations.pending')}
          </button>
          <button
            onClick={() => setSection('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              section === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {t('invitations.joined')}
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-8 text-center sm:p-12">
            <Inbox className="w-10 h-10 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400">{t('invitations.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{item.event.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-neutral-400">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatEventDate(item.event.date, item.event.timezone)}
                    </span>
                    {item.event.location && (
                      <span className="hidden sm:inline-flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-neutral-500" />
                        {item.event.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {section === 'pending' && item.status === 'invited' ? (
                    <>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={processing === item.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" />
                        {t('invitations.reject')}
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
                        {t('invitations.accept')}
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
                      {item.status === 'accepted'
                        ? t('invitations.accepted')
                        : t('invitations.rejected')}
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
