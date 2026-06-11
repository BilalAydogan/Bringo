import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChevronDown,
  LogOut,
  CalendarDays,
  Languages,
  Shield,
  User,
  UserCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const displayName = useMemo(() => {
    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return fullName || user?.email || t('common.account');
  }, [t, user?.email, user?.firstName, user?.lastName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
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
    setMenuOpen(false);
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
