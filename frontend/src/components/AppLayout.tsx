import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  LogOut,
  CalendarDays,
  Languages,
  Shield,
  User,
  UserCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import type { ApiResponse } from '../types/api';
import type { AppNotification, NotificationListResponse } from '../types/notification';
import {
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from '../utils/browserNotifications';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationsStreamAbortRef = useRef<AbortController | null>(null);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const displayName = useMemo(() => {
    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return fullName || user?.email || t('common.account');
  }, [t, user?.email, user?.firstName, user?.lastName]);

  const applyNotificationPayload = useCallback(
    async (payload: NotificationListResponse) => {
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      setNotifications(payload.items);
      setUnreadCount(payload.unread_count);

      if (notificationPermission !== 'granted') {
        return;
      }

      const shownKey = `shown-notifications:${user.id}`;

      let shownIds = new Set<string>();
      try {
        shownIds = new Set<string>(
          JSON.parse(localStorage.getItem(shownKey) || '[]') as string[],
        );
      } catch {
        shownIds = new Set<string>();
      }

      const unseen = payload.items.filter((item) => !item.is_read && !shownIds.has(item.id));

      for (const item of unseen) {
        await showBrowserNotification(item.title, {
          body: item.message,
          url: item.url,
        });
        shownIds.add(item.id);
      }

      localStorage.setItem(shownKey, JSON.stringify(Array.from(shownIds).slice(-50)));
    },
    [notificationPermission, user],
  );

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const response = await axiosInstance.get<ApiResponse<NotificationListResponse>>(
        '/notifications?limit=8',
      );
      await applyNotificationPayload(response.data.data);
    } catch {
      // Notification polling is best-effort.
    }
  }, [applyNotificationPayload, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selectLanguage = async (language: 'tr' | 'en') => {
    await i18n.changeLanguage(language);
    if (user) {
      try {
        await axiosInstance.post('/locale', { locale: language });
      } catch {
        // Locale preference sync is best-effort.
      }
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      notificationsStreamAbortRef.current?.abort();
      notificationsStreamAbortRef.current = null;
      return;
    }

    const refreshNotifications = () => {
      void loadNotifications();
    };

    refreshNotifications();
    const intervalId = window.setInterval(() => {
      refreshNotifications();
    }, 5000);

    const handleFocus = () => {
      refreshNotifications();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadNotifications, user]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!user || !token) {
      notificationsStreamAbortRef.current?.abort();
      notificationsStreamAbortRef.current = null;
      return;
    }

    let cancelled = false;
    let reconnectTimer: number | null = null;
    const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(
      /\/$/,
      '',
    );
    const streamUrl = `${apiBaseUrl}/notifications/stream`;

    const connect = async () => {
      const controller = new AbortController();
      notificationsStreamAbortRef.current = controller;

      try {
        const response = await fetch(streamUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Notification stream failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const lines = rawEvent.split('\n');
            let eventName = 'message';
            const dataLines: string[] = [];

            for (const line of lines) {
              if (line.startsWith(':') || line.trim() === '') {
                continue;
              }

              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
                continue;
              }

              if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim());
              }
            }

            if (eventName !== 'notifications' || dataLines.length === 0) {
              continue;
            }

            try {
              const payload = JSON.parse(dataLines.join('\n')) as NotificationListResponse;
              await applyNotificationPayload(payload);
            } catch {
              // Ignore malformed stream payloads.
            }
          }
        }
      } catch {
        if (!cancelled) {
          void loadNotifications();
          reconnectTimer = window.setTimeout(() => {
            void connect();
          }, 3000);
        }
      } finally {
        if (notificationsStreamAbortRef.current === controller) {
          notificationsStreamAbortRef.current = null;
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      notificationsStreamAbortRef.current?.abort();
      notificationsStreamAbortRef.current = null;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [applyNotificationPayload, loadNotifications, user]);

  useEffect(() => {
    if (notificationsOpen) {
      void loadNotifications();
    }
  }, [loadNotifications, notificationsOpen]);

  const handleEnableNotifications = async () => {
    const permission = await requestBrowserNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      void loadNotifications();
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    setNotificationsOpen(false);

    if (!notification.is_read) {
      try {
        await axiosInstance.post(`/notifications/${notification.id}/read`);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // Navigation should still continue.
      }
    }

    navigate(notification.url || '/');
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.post('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Keep current UI if request fails.
    }
  };

  const formatNotificationDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || 'tr', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <h1 className="truncate text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent sm:text-xl">
              Bringo
            </h1>
          </Link>

          <div className="flex items-center justify-end gap-3">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-700/60 bg-neutral-800/60 text-neutral-200 transition-colors hover:bg-neutral-800"
                aria-label={t('notifications.title')}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-neutral-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40 sm:absolute sm:right-0 sm:left-auto sm:top-auto sm:mt-2 sm:w-[26rem] sm:max-w-[26rem]">
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-3 py-3 sm:px-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{t('notifications.title')}</p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {t('notifications.unread', { count: unreadCount })}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-800"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        {t('notifications.markAllRead')}
                      </button>
                    )}
                  </div>

                  {notificationPermission !== 'granted' && (
                    <div className="border-b border-neutral-800 px-3 py-3 sm:px-4">
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/15"
                      >
                        {t('notifications.enable')}
                      </button>
                    </div>
                  )}

                  <div className="max-h-[min(70vh,26rem)] overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="rounded-xl px-3 py-6 text-center text-sm text-neutral-500">
                        {t('notifications.empty')}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                            notification.is_read
                              ? 'border-neutral-900 bg-neutral-950 text-neutral-300 hover:bg-neutral-900'
                              : 'border-amber-500/20 bg-amber-500/10 text-white hover:bg-amber-500/15'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{notification.title}</p>
                              <p className="mt-1 break-words text-sm text-neutral-400">
                                {notification.message}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                            )}
                          </div>
                          <p className="mt-2 text-xs text-neutral-500">
                            {formatNotificationDate(notification.created_at)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-3 rounded-xl border border-neutral-700/60 bg-neutral-800/60 px-2.5 py-2 text-left transition-colors hover:bg-neutral-800 sm:px-3"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-40 truncate text-sm font-medium text-white">{displayName}</p>
                  <p className="max-w-40 truncate text-xs text-neutral-400">{user?.email}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/40 sm:w-80"
                >
                  <div className="border-b border-neutral-800 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{displayName}</p>
                    <p className="mt-1 text-sm text-neutral-400">{user?.email}</p>
                  </div>

                  <div className="border-b border-neutral-800 px-4 py-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      {t('common.language')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['tr', 'en'] as const).map((language) => (
                        <button
                          key={language}
                          type="button"
                          onClick={() => selectLanguage(language)}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                            (i18n.resolvedLanguage || i18n.language || 'tr').startsWith(language)
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          <Languages className="h-4 w-4" />
                          {language.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-200 transition-colors hover:bg-neutral-900"
                      role="menuitem"
                    >
                      <UserCircle2 className="h-4 w-4 text-neutral-400" />
                      {t('nav.profile')}
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-200 transition-colors hover:bg-neutral-900"
                        role="menuitem"
                      >
                        <Shield className="h-4 w-4 text-neutral-400" />
                        {t('layout.adminPanel')}
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('common.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
