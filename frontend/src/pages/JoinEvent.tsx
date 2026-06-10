import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import { ArrowLeft, Copy, Check, Loader2, Link2 } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function JoinEvent() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  if (!code) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-24">
          <p className="text-red-400 mb-6">Geçersiz davet bağlantısı.</p>
          <Link to="/" className="text-blue-400 hover:text-blue-300">Ana sayfaya dön</Link>
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
        participantStatus === 'accepted'
          ? 'Etkinliğe başarıyla katıldınız.'
          : 'Zaten bu etkinliğe katılımcısınız.',
      );
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error?.message || 'Katılım sırasında bir hata oluştu.');
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
      <div className="max-w-xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Etkinlikler
        </Link>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
            <Link2 className="w-6 h-6 text-blue-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Etkinliğe Katıl</h2>
          <p className="text-neutral-400 mb-8">
            Bu davet bağlantısıyla etkinliğe katılabilirsiniz. Katıldığınızda etkinliğin detaylarını ve diğer katılımcıları görebileceksiniz.
          </p>

          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-neutral-400 mb-1">Davet Kodu</p>
                <p className="text-sm font-mono text-white break-all">{code}</p>
              </div>
              <button
                onClick={handleCopyInvite}
                className="shrink-0 p-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-300 transition-colors"
                title="Kodu kopyala"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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
                Katılıyor...
              </span>
            ) : status === 'success' ? (
              'Katıldınız'
            ) : (
              'Etkinliğe Katıl'
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
