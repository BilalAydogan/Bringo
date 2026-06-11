import { useMemo, useState, type FormEvent } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { formatDateTime } from '../utils/date';
import { CheckCircle2, LockKeyhole, UserCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../utils/api';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fullName = useMemo(() => {
    const value = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    return value || user?.email || '-';
  }, [user?.email, user?.firstName, user?.lastName]);

  const roleLabel = useMemo(() => {
    if (user?.roles.includes('ROLE_ADMIN')) {
      return t('profile.adminRole');
    }
    return t('profile.userRole');
  }, [t, user?.roles]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }

    setSaving(true);
    try {
      const response = await axiosInstance.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setMessage(response.data.message || t('profile.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('profile.updateError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">
            {t('profile.overviewLabel')}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{t('profile.title')}</h2>
          <p className="mt-2 text-neutral-400">{t('profile.subtitle')}</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {t('profile.accountCardTitle')}
                </h3>
                <p className="text-sm text-neutral-400">{t('profile.accountCardSubtitle')}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('profile.fullName')}
                </p>
                <p className="mt-1 text-sm text-white">{fullName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('profile.email')}
                </p>
                <p className="mt-1 text-sm text-white">{user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('profile.roles')}
                </p>
                <p className="mt-1 text-sm text-white">{roleLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('profile.createdAt')}
                </p>
                <p className="mt-1 text-sm text-white">
                  {user?.createdAt ? formatDateTime(user.createdAt) : '-'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {t('profile.securityCardTitle')}
                </h3>
                <p className="text-sm text-neutral-400">{t('profile.securityCardSubtitle')}</p>
              </div>
            </div>

            {message && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {message}
                </span>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  {t('profile.currentPassword')}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/50"
                  placeholder={t('profile.currentPassword')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    {t('profile.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/50"
                    placeholder={t('profile.newPassword')}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    {t('profile.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/50"
                    placeholder={t('profile.confirmPassword')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:opacity-60 sm:w-auto"
              >
                {saving ? t('profile.saving') : t('profile.updatePassword')}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 border-t border-neutral-800 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <Link to="/" className="text-neutral-400 hover:text-white transition-colors">
                {t('common.backToHome')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
