import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import { formatEventDate, isEventPast } from '../utils/date';
import type { Event } from '../types/event';
import { Plus, Calendar, MapPin, Loader2, CalendarDays, Users } from 'lucide-react';

type Tab = 'upcoming' | 'owned' | 'joined' | 'past';

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('upcoming');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [ownedRes, joinedRes] = await Promise.all([
          axiosInstance.get('/events'),
          axiosInstance.get('/events/joined'),
        ]);

        setEvents(ownedRes.data.data ?? []);
        setJoinedEvents(joinedRes.data.data ?? []);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Etkinlikler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const owned = useMemo(() => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [events]);
  const joined = useMemo(() => [...joinedEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [joinedEvents]);
  const merged = useMemo(() => [...owned, ...joined].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i), [owned, joined]);

  const pastOwned = useMemo(() => owned.filter((e) => isEventPast(e.date)), [owned]);
  const pastJoined = useMemo(() => joined.filter((e) => isEventPast(e.date)), [joined]);
  const pastMerged = useMemo(() => [...pastOwned, ...pastJoined].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i), [pastOwned, pastJoined]);

  const upcomingMerged = useMemo(() => merged.filter((e) => !isEventPast(e.date)), [merged]);

  const displayed =
    tab === 'upcoming'
      ? upcomingMerged
      : tab === 'owned'
        ? owned.filter((e) => !isEventPast(e.date))
        : tab === 'joined'
          ? joined.filter((e) => !isEventPast(e.date))
          : pastMerged;

  const isEmpty = displayed.length === 0;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-1">Etkinliklerim</h2>
          <p className="text-neutral-400">Oluşturduğunuz ve katıldığınız etkinlikleri yönetin</p>
        </div>
        <Link
          to="/events/new"
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Yeni Etkinlik
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Yaklaşan Etkinlikler
        </button>
        <button
          onClick={() => setTab('owned')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'owned' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Oluşturduğum
        </button>
        <button
          onClick={() => setTab('joined')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'joined' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Katıldığım
        </button>
        <button
          onClick={() => setTab('past')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'past' ? 'bg-neutral-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Geçmiş Etkinlikler
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className="text-center py-24 bg-neutral-900/50 border border-neutral-800 rounded-3xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-2xl flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-neutral-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Henüz etkinlik yok</h3>
          <p className="text-neutral-400 mb-6">İlk etkinliğinizi oluşturarak başlayın.</p>
        </div>
      )}

      {!loading && !error && !isEmpty && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((event) => {
            const past = isEventPast(event.date);
            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className={`group p-6 rounded-2xl transition-all ${
                  past
                    ? 'bg-neutral-900/60 border border-neutral-800/70 opacity-75 hover:opacity-90'
                    : 'bg-neutral-900 border border-neutral-800 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {event.title}
                  </h3>
                  {past && (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-neutral-800 text-xs text-neutral-300 border border-neutral-700">
                      Geçmiş
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{formatEventDate(event.date)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
