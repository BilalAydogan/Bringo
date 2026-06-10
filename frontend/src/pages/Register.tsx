import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { Mail, Lock, UserPlus, User, X, FileText } from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  content: string;
  version: number;
}

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [contractLoading, setContractLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await axiosInstance.get('/contracts/active');
        const activeContract: Contract | undefined = response.data.data?.contract;
        if (activeContract) {
          setContract(activeContract);
        }
      } catch {
        setError('Kullanıcı sözleşmesi yüklenemedi. Lütfen sayfayı yenileyin.');
      } finally {
        setContractLoading(false);
      }
    };

    fetchContract();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!acceptTerms) {
      setError('Kayıt olmak için kullanıcı sözleşmesini kabul etmelisiniz.');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        acceptTerms,
      });

      setSuccess(response.data.message || 'Kayıt başarılı! Lütfen e-postanızı kontrol edin.');
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Kayıt olurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(59,130,246,0.15)] relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center border border-neutral-700 shadow-inner">
              <UserPlus className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Hesap Oluştur</h2>
          <p className="text-center text-neutral-400 mb-8">Saniyeler içinde aramıza katılın</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                  placeholder="Adınız"
                  required
                  minLength={2}
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="block w-full px-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                  placeholder="Soyadınız"
                  required
                  minLength={2}
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
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
                  className="block w-full pl-12 pr-4 py-3.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                  placeholder="Parolanız (min. 6 karakter)"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={contractLoading || !contract}
                className="mt-1 h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-neutral-950"
              />
              <label htmlFor="acceptTerms" className="text-sm text-neutral-300 leading-relaxed">
                <button
                  type="button"
                  onClick={() => setShowContractModal(true)}
                  disabled={!contract}
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {contract?.title ?? 'Kullanıcı Sözleşmesi'}
                </button>
                {' '}ni okudum ve kabul ediyorum.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !!success || contractLoading || !contract}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-70"
            >
              {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-400">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>

      {showContractModal && contract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">{contract.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">{contract.content}</p>
            </div>
            <div className="px-6 py-4 border-t border-neutral-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcceptTerms(true);
                  setShowContractModal(false);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                Kabul Ediyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
