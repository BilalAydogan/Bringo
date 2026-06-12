import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getApiErrorMessage } from '../utils/api';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';
  const isResetMode = token !== '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [isResetMode]);

  const content = useMemo(
    () =>
      isResetMode
        ? {
            title: t('auth.resetPasswordTitle'),
            subtitle: t('auth.resetPasswordSubtitle'),
            submit: t('auth.resetPasswordSubmit'),
            submitting: t('auth.resetPasswordSubmitting'),
            successMessage: t('auth.resetPasswordSuccess'),
            errorFallback: t('auth.resetPasswordError'),
          }
        : {
            title: t('auth.forgotPasswordTitle'),
            subtitle: t('auth.forgotPasswordSubtitle'),
            submit: t('auth.forgotPasswordSubmit'),
            submitting: t('auth.forgotPasswordSubmitting'),
            successMessage: t('auth.forgotPasswordSuccess'),
            errorFallback: t('auth.forgotPasswordError'),
          },
    [isResetMode, t],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isResetMode) {
        await axiosInstance.post('/auth/reset-password', {
          token,
          password,
        });
        setSuccess(content.successMessage);
        window.setTimeout(() => navigate('/login'), 2000);
      } else {
        await axiosInstance.post('/auth/forgot-password', { email });
        setSuccess(content.successMessage);
      }
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, content.errorFallback));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 p-5 shadow-[0_0_50px_-12px_rgba(59,130,246,0.18)] sm:p-8">
        <div className="absolute right-4 top-4 z-20">
          <LanguageSwitcher />
        </div>

        <div className="relative z-10">
          <div className="mb-8 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-800 shadow-inner">
              <KeyRound className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <h2 className="mb-2 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {content.title}
          </h2>
          <p className="mb-8 text-center text-neutral-400">{content.subtitle}</p>

          {!isResetMode && success && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
              {success}
            </div>
          )}

          {isResetMode && !token && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-400">
              {t('auth.resetPasswordInvalidLink')}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-400">
              {error}
            </div>
          )}

          {isResetMode && success && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isResetMode ? (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <KeyRound className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-800 bg-neutral-950 py-3.5 pl-12 pr-4 text-neutral-100 outline-none transition-all placeholder:text-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                  placeholder={t('auth.newPasswordPlaceholder')}
                  minLength={6}
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-neutral-800 bg-neutral-950 py-3.5 pl-12 pr-4 text-neutral-100 outline-none transition-all placeholder:text-neutral-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isResetMode && token === '')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-cyan-500 disabled:opacity-70"
            >
              {loading ? content.submitting : content.submit}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('auth.back')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
