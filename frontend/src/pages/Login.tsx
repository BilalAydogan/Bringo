import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Activity, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giriş yapılırken bir hata oluştu.');
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
      setError('Lütfen 6 haneli kodu eksiksiz girin.');
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post('/auth/verify-2fa', {
        username: email,
        code: code,
      });

      login(response.data.token, response.data.refresh_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Doğrulama kodu geçersiz veya süresi dolmuş.');
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
    } catch (err: any) {
      setError('Kod tekrar gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(168,85,247,0.15)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10">
          {/* Step 1: Email & Password */}
          {step === 1 && (
            <>
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-neutral-700 shadow-inner">
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Tekrar Hoş Geldiniz</h2>
              <p className="text-center text-neutral-400 mb-8">Devam etmek için hesabınıza giriş yapın</p>

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
                      placeholder="E-posta adresiniz"
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
                      placeholder="Parolanız"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-purple-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-70"
                >
                  {loading ? 'Giriş Yapılıyor...' : (
                    <>
                      Devam Et
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-neutral-400">
                Hesabınız yok mu?{' '}
                <Link to="/register" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                  Hemen Kayıt Olun
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

              <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Doğrulama Kodu</h2>
              <p className="text-center text-neutral-400 mb-2">
                E-posta adresinize 6 haneli bir kod gönderdik
              </p>
              <p className="text-center text-purple-400 text-sm font-medium mb-8">{email}</p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify2fa} className="space-y-6">
                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-emerald-500 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-70"
                >
                  {loading ? 'Doğrulanıyor...' : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Doğrula ve Giriş Yap
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
                  Kodu tekrar gönder
                </button>
                <button
                  onClick={() => { setStep(1); setError(''); setOtpDigits(['', '', '', '', '', '']); }}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Geri dön
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
