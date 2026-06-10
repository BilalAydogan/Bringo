import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('E-postanız doğrulanıyor...');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Geçersiz doğrulama bağlantısı.');
      return;
    }

    axiosInstance.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        setMessage('E-posta adresiniz başarıyla doğrulandı!');
        setTimeout(() => navigate('/login'), 3000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Doğrulama işlemi sırasında bir hata oluştu.');
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        
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
          {status === 'loading' ? 'Lütfen Bekleyin' : status === 'success' ? 'Başarılı!' : 'Hata!'}
        </h2>
        <p className="text-neutral-400 mb-6">{message}</p>

        {status === 'success' && (
          <p className="text-sm text-neutral-500">Giriş sayfasına yönlendiriliyorsunuz...</p>
        )}

        {status === 'error' && (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 rounded-xl text-white bg-neutral-800 hover:bg-neutral-700 transition-colors font-medium"
          >
            Giriş Sayfasına Dön
          </button>
        )}
      </div>
    </div>
  );
}
