import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import ContractDiffView from '../components/ContractDiffView';
import type { DiffLine } from '../components/ContractDiffView';
import { FileText, ShieldCheck, Mail, Loader2 } from 'lucide-react';

interface Contract {
  id: string;
  title: string;
  content: string;
  version: number;
}

interface ApprovalData {
  contract: Contract;
  previous_contract: Contract | null;
  diff: DiffLine[] | null;
}

export default function ContractApproval() {
  const [approval, setApproval] = useState<ApprovalData | null>(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showFullText, setShowFullText] = useState(false);
  const navigate = useNavigate();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const contract = approval?.contract;
  const hasDiff = approval?.diff && approval.diff.length > 0 && approval.previous_contract;

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axiosInstance.get('/contracts/status');
        const approvalData: ApprovalData | null = response.data.data?.approval ?? null;

        if (!response.data.data?.has_pending || !approvalData?.contract) {
          navigate('/');
          return;
        }

        setApproval(approvalData);
      } catch {
        setError('Sözleşme durumu yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async () => {
    if (!contract) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await axiosInstance.post('/contracts/request-otp', {
        contractId: contract.id,
      });
      setOtpSent(true);
      setResendCooldown(60);
      setSuccess(response.data.message || 'Doğrulama kodu gönderildi.');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const code = err.response?.data?.error?.code;
      if (code === 'RESEND_COOLDOWN') {
        setResendCooldown(60);
      }
      setError(err.response?.data?.error?.message || 'Kod gönderilemedi.');
    } finally {
      setSubmitting(false);
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

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || submitting) return;

    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await axiosInstance.post('/contracts/verify-otp', {
        contractId: contract.id,
        code,
      });

      setOtpDigits(['', '', '', '', '', '']);
      setOtpSent(false);
      setSuccess(response.data.message || 'Sözleşme onaylandı.');

      if (!response.data.data?.has_pending) {
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Doğrulama başarısız.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-[0_0_50px_-12px_rgba(59,130,246,0.15)] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Güncel Sözleşme Onayı</h2>
              <p className="text-sm text-neutral-400">
                {approval?.previous_contract
                  ? `Sözleşme v${approval.previous_contract.version} sürümünden v${contract.version} sürümüne güncellendi.`
                  : 'Devam etmek için güncel sözleşmeyi onaylamanız gerekiyor.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {success}
            </div>
          )}

          <div className="mb-6 p-5 rounded-2xl bg-neutral-950 border border-neutral-800 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">{contract.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v{contract.version} aktif
                </span>
              </div>
              {hasDiff && (
                <button
                  type="button"
                  onClick={() => setShowFullText((v) => !v)}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  {showFullText ? 'Farkı göster' : 'Tam metni göster'}
                </button>
              )}
            </div>

            {hasDiff && !showFullText ? (
              <ContractDiffView
                diff={approval.diff!}
                previousVersion={approval.previous_contract!.version}
                currentVersion={contract.version}
              />
            ) : (
              <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">
                {contract.content}
              </p>
            )}
          </div>

          {!otpSent ? (
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-70"
            >
              <Mail className="w-4 h-4" />
              {submitting ? 'Gönderiliyor...' : 'Onay Kodu Gönder'}
            </button>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <p className="text-sm text-neutral-400 text-center">
                E-posta adresinize gönderilen 6 haneli kodu girin.
              </p>

              <div className="flex justify-center gap-2">
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
                    className="w-12 h-14 text-center text-xl font-bold bg-neutral-950 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting || otpDigits.join('').length !== 6}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all disabled:opacity-70"
              >
                {submitting ? 'Doğrulanıyor...' : 'Güncel Sözleşmeyi Onayla'}
              </button>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={submitting || resendCooldown > 0}
                className="w-full text-sm text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? `Yeni kod gönder (${resendCooldown}s)`
                  : 'Kodu tekrar gönder'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
