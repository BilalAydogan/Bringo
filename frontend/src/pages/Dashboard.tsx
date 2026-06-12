import { useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosResponse } from 'axios';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import { formatEventDate, isEventPast } from '../utils/date';
import type { PaginatedResponse } from '../types/api';
import type { Event } from '../types/event';
import { Plus, Calendar, MapPin, Loader2, CalendarDays, Users, Clock3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../utils/api';

type Tab = 'upcoming' | 'owned' | 'joined' | 'past';
const PAGE_SIZE = 12;

function compareEventDates(firstDate: string, secondDate: string): number {
  const first = new Date(firstDate).getTime();
  const second = new Date(secondDate).getTime();

  if (Number.isNaN(first) && Number.isNaN(second)) return 0;
  if (Number.isNaN(first)) return 1;
  if (Number.isNaN(second)) return -1;

  return first - second;
}

function normalizeEvents(value: unknown): Event[] {
  return extractEvents(value);
}

function sortEvents(events: unknown, direction: 'asc' | 'desc' = 'asc'): Event[] {
  return [...normalizeEvents(events)].sort((a, b) => {
    const result = compareEventDates(a.date, b.date);

    return direction === 'asc' ? result : -result;
  });
}

function isEvent(value: unknown): value is Event {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<Event>;

  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.date === 'string'
  );
}

function extractEvents(payload: unknown): Event[] {
  if (Array.isArray(payload)) {
    return payload.filter(isEvent);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = payload as { items?: unknown };

  return Array.isArray(data.items) ? data.items.filter(isEvent) : [];
}

async function fetchAllEvents(url: string): Promise<Event[]> {
  const firstResponse = await axiosInstance.get<PaginatedResponse<Event>>(url);
  const firstItems = extractEvents(firstResponse.data?.data);
  const totalPages = firstResponse.data?.data?.meta?.totalPages ?? 1;

  if (totalPages <= 1) {
    return firstItems;
  }

  const requests: Array<Promise<AxiosResponse<PaginatedResponse<Event>>>> = [];

  for (let page = 2; page <= totalPages; page += 1) {
    const separator = url.includes('?') ? '&' : '?';
    requests.push(
      axiosInstance.get<PaginatedResponse<Event>>(`${url}${separator}page=${page}`),
    );
  }

  const responses = await Promise.all(requests);

  return responses.reduce<Event[]>(
    (allEvents, response) => [...allEvents, ...extractEvents(response.data?.data)],
    firstItems,
  );
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('upcoming');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [ownedEvents, joinedPageEvents] = await Promise.all([
          fetchAllEvents('/events?limit=50'),
          fetchAllEvents('/events/joined?limit=50'),
        ]);

        setEvents(normalizeEvents(ownedEvents));
        setJoinedEvents(normalizeEvents(joinedPageEvents));
      } catch (error: unknown) {
        setError(getApiErrorMessage(error, t('dashboard.loadError')));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => {
      mediaQuery.removeEventListener('change', updateViewport);
    };
  }, []);

  const owned = useMemo(
    () => sortEvents(events),
    [events],
  );
  const joined = useMemo(
    () => sortEvents(joinedEvents),
    [joinedEvents],
  );
  const merged = useMemo(
    () => [...owned, ...joined].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i),
    [owned, joined],
  );

  const pastOwned = useMemo(() => owned.filter((e) => isEventPast(e.date)), [owned]);
  const pastJoined = useMemo(() => joined.filter((e) => isEventPast(e.date)), [joined]);
  const pastMerged = useMemo(
    () =>
      sortEvents(
        [...pastOwned, ...pastJoined].filter(
          (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i,
        ),
        'desc',
      ),
    [pastOwned, pastJoined],
  );

  const upcomingMerged = useMemo(
    () => sortEvents(merged.filter((e) => !isEventPast(e.date)), 'asc'),
    [merged],
  );

  const displayed =
    tab === 'upcoming'
      ? upcomingMerged
      : tab === 'owned'
        ? owned.filter((e) => !isEventPast(e.date))
        : tab === 'joined'
          ? joined.filter((e) => !isEventPast(e.date))
          : pastMerged;
  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDisplayed = isMobile
    ? displayed.slice(0, safePage * PAGE_SIZE)
    : displayed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (!isMobile || safePage >= totalPages || loading) {
      return;
    }

    const target = loadMoreRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry?.isIntersecting) {
          setCurrentPage((page) => Math.min(totalPages, page + 1));
        }
      },
      {
        rootMargin: '160px 0px',
      },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [isMobile, safePage, totalPages, loading]);

  const isEmpty = displayed.length === 0;
  const tabs: Array<{ key: Tab; label: string; icon: typeof CalendarDays; activeClass: string }> = [
    {
      key: 'upcoming',
      label: t('dashboard.upcoming'),
      icon: CalendarDays,
      activeClass: 'bg-blue-600 text-white',
    },
    {
      key: 'owned',
      label: t('dashboard.owned'),
      icon: Plus,
      activeClass: 'bg-blue-600 text-white',
    },
    {
      key: 'joined',
      label: t('dashboard.joined'),
      icon: Users,
      activeClass: 'bg-emerald-600 text-white',
    },
    {
      key: 'past',
      label: t('dashboard.past'),
      icon: Clock3,
      activeClass: 'bg-neutral-600 text-white',
    },
  ];

  return (
    <AppLayout>
      <div className="pb-24 sm:pb-0">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="mb-1 text-2xl font-bold sm:text-3xl">{t('dashboard.title')}</h2>
            <p className="text-neutral-400">{t('dashboard.subtitle')}</p>
          </div>
          <Link
            to="/events/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 px-5 py-3 text-sm font-medium text-white transition-all shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-emerald-500 md:w-auto"
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.newEvent')}
          </Link>
        </div>

        <div className="mb-6 hidden flex-wrap gap-2 sm:flex">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  tab === item.key
                    ? item.activeClass
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
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
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 py-16 text-center sm:py-24">
            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-2xl flex items-center justify-center">
              <CalendarDays className="w-8 h-8 text-neutral-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('dashboard.emptyTitle')}</h3>
            <p className="text-neutral-400 mb-6">{t('dashboard.emptySubtitle')}</p>
          </div>
        )}

        {!loading && !error && !isEmpty && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedDisplayed.map((event) => {
              const past = isEventPast(event.date);
              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className={`group rounded-2xl p-5 transition-all sm:p-6 ${
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
                        {t('dashboard.past')}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-neutral-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{formatEventDate(event.date, event.timezone)}</span>
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

        {!loading && !error && !isMobile && displayed.length > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors disabled:opacity-50"
            >
              {t('dashboard.previous', 'Previous')}
            </button>
            <span className="text-sm text-neutral-400">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors disabled:opacity-50"
            >
              {t('dashboard.next', 'Next')}
            </button>
          </div>
        )}

        {!loading && !error && isMobile && safePage < totalPages && (
          <div ref={loadMoreRef} className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          </div>
        )}

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-950 shadow-lg shadow-black/20'
                      : 'bg-neutral-900 text-neutral-400'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-neutral-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </AppLayout>
  );
}
