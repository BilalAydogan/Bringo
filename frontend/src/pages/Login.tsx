import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Activity, ShieldCheck, ArrowLeft } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getApiErrorMessage } from '../utils/api';

type TokenPayload = {
  roles?: string[];
};

export default function Login() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isAdminEntry = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (step === 2 && otpRefs.current[0]) {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axiosInstance.post('/auth/login', {
        username: email,
        password: password,
      });

      if (response.data.requires_2fa) {
        setStep(2);
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const nextFocus = Math.min(pasted.length, 5);
    otpRefs.current[nextFocus]?.focus();
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError(t('auth.invalidOtp'));
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post('/auth/verify-2fa', {
        username: email,
        code: code,
      });

      login(response.data.token, response.data.refresh_token);
      const decoded = jwtDecode<TokenPayload>(response.data.token);
      const hasAdminRole = decoded.roles?.includes('ROLE_ADMIN');
      navigate(isAdminEntry && hasAdminRole ? '/admin' : '/');
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('auth.otpExpired')));
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await axiosInstance.post('/auth/login', {
        username: email,
        password: password,
      });
      setError('');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch {
      setError(t('auth.resendFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 p-5 shadow-[0_0_50px_-12px_rgba(168,85,247,0.15)] sm:p-8">
        <div className="absolute right-4 top-4 z-20">
          <LanguageSwitcher />
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div
          className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: '2s' }}
        ></div>

        <div className="relative z-10">
          {/* Step 1: Email & Password */}
          {step === 1 && (
            <>
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-neutral-700 shadow-inner">
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold tracking-tight text-center text-white sm:text-3xl">
                {isAdminEntry ? t('auth.loginAdminTitle') : t('auth.loginTitle')}
              </h2>
              <p className="text-center text-neutral-400 mb-8">
                {isAdminEntry ? t('auth.loginAdminSubtitle') : t('auth.loginSubtitle')}
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                      placeholder={t('auth.emailPlaceholder')}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none"
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-purple-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-70"
                >
                  {loading ? (
                    t('auth.loggingIn')
                  ) : (
                    <>
                      {t('auth.continue')}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-neutral-400">
                {t('auth.noAccount')}{' '}
                <Link
                  to="/register"
                  className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {t('auth.registerNow')}
                </Link>
              </p>
            </>
          )}

          {/* Step 2: 2FA OTP Code */}
          {step === 2 && (
            <>
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-neutral-700 shadow-inner">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">
                {t('auth.otpTitle')}
              </h2>
              <p className="text-center text-neutral-400 mb-2">{t('auth.otpSubtitle')}</p>
              <p className="text-center text-purple-400 text-sm font-medium mb-8">{email}</p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify2fa} className="space-y-6">
                <div
                  className="mx-auto grid w-full max-w-[22rem] grid-cols-6 gap-2 sm:gap-3"
                  onPaste={handleOtpPaste}
                >
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="h-14 w-full min-w-0 rounded-xl border border-neutral-800 bg-neutral-950 text-center text-xl font-bold text-white outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-emerald-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-70"
                >
                  {loading ? (
                    t('auth.otpLoading')
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {t('auth.verifyAndSignIn')}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-neutral-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                >
                  {t('auth.resendCode')}
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setError('');
                    setOtpDigits(['', '', '', '', '', '']);
                  }}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t('auth.back')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
