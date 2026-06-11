import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import { ArrowLeft, Copy, Check, Loader2, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getApiErrorMessage } from '../utils/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function JoinEvent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  if (!code) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-24">
          <p className="text-red-400 mb-6">{t('joinEvent.invalidCode')}</p>
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            {t('common.backToHome')}
          </Link>
        </div>
      </AppLayout>
    );
  }

  const handleJoin = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const response = await axiosInstance.post(`/events/join/${code}`);
      const participantStatus = response.data.data.status;
      setStatus('success');
      setMessage(
        participantStatus === 'accepted' ? t('joinEvent.success') : t('joinEvent.alreadyJoined'),
      );
      setTimeout(() => navigate('/'), 1200);
    } catch (error: unknown) {
      setStatus('error');
      setMessage(getApiErrorMessage(error, t('joinEvent.error')));
    } finally {
      setStatus('idle');
    }
  };

  const handleCopyInvite = async () => {
    const url = `${window.location.origin}/events/join/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="relative mx-auto max-w-xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('joinEvent.back')}
        </Link>

        <div className="absolute right-0 top-0 z-20 sm:right-4 sm:top-4">
          <LanguageSwitcher />
        </div>
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 sm:p-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
            <Link2 className="w-6 h-6 text-blue-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2">{t('joinEvent.title')}</h2>
          <p className="text-neutral-400 mb-8">{t('joinEvent.subtitle')}</p>

          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-neutral-400 mb-1">{t('joinEvent.codeLabel')}</p>
                <p className="text-sm font-mono text-white break-all">{code}</p>
              </div>
              <button
                onClick={handleCopyInvite}
                className="shrink-0 p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
                title={t('common.copy')}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm ${
                status === 'error'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}
            >
              {message}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={status === 'loading' || status === 'success'}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all disabled:opacity-70"
          >
            {status === 'loading' ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('joinEvent.joining')}
              </span>
            ) : status === 'success' ? (
              t('joinEvent.joined')
            ) : (
              t('joinEvent.join')
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
