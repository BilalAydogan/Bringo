import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { normalizeLanguage } from '../i18n';
import { getApiErrorMessage } from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const lang = searchParams.get('lang');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const applyLanguage = async () => {
      if (lang) {
        await i18n.changeLanguage(normalizeLanguage(lang));
      }

      if (!cancelled) {
        setMessage(t('verifyEmail.loading'));
      }
    };

    applyLanguage();

    return () => {
      cancelled = true;
    };
  }, [lang, i18n, t]);

  useEffect(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    if (!token) {
      setStatus('error');
      setMessage(t('verifyEmail.invalid'));
      return;
    }

    const run = async () => {
      try {
        await axiosInstance.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(t('verifyEmail.success'));
        setTimeout(() => navigate('/login'), 3000);
      } catch (error: unknown) {
        setStatus('error');
        setMessage(getApiErrorMessage(error, t('verifyEmail.error')));
      }
    };

    run();
  }, [token, navigate, t]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        <div className="absolute right-4 top-4 z-20">
          <LanguageSwitcher />
        </div>

        {status === 'loading' && (
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-6" />
        )}

        {status === 'success' && (
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
        )}

        {status === 'error' && (
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-white mb-2">
          {status === 'loading'
            ? t('verifyEmail.titleLoading')
            : status === 'success'
              ? t('verifyEmail.titleSuccess')
              : t('verifyEmail.titleError')}
        </h2>
        <p className="text-neutral-400 mb-6">{message}</p>

        {status === 'success' && (
          <p className="text-sm text-neutral-500">{t('verifyEmail.redirecting')}</p>
        )}

        {status === 'error' && (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 rounded-xl text-white bg-neutral-800 hover:bg-neutral-700 transition-colors font-medium"
          >
            {t('verifyEmail.backToLogin')}
          </button>
        )}
      </div>
    </div>
  );
}
