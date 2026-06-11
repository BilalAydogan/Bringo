import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import ContractDiffView from '../components/ContractDiffView';
import type { DiffLine } from '../components/ContractDiffView';
import { FileText, ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getApiErrorMessage } from '../utils/api';
import axios from 'axios';

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
  const { t } = useTranslation();

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
        setError(t('contractApproval.loadingError'));
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [navigate, t]);

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
      setSuccess(response.data.message || t('contractApproval.successOtp'));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (error: unknown) {
      const code = axios.isAxiosError<{ error?: { code?: string } }>(error)
        ? error.response?.data?.error?.code
        : undefined;
      if (code === 'RESEND_COOLDOWN') {
        setResendCooldown(60);
      }
      setError(getApiErrorMessage(error, t('contractApproval.resendCooldown')));
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
      setError(t('contractApproval.invalidOtp'));
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
      setSuccess(response.data.message || t('contractApproval.approved'));

      if (!response.data.data?.has_pending) {
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('contractApproval.verifyFailed')));
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
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 p-5 shadow-[0_0_50px_-12px_rgba(59,130,246,0.15)] sm:p-8">
        <div className="absolute right-4 top-4 z-20">
          <LanguageSwitcher />
        </div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

        <div className="relative z-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{t('contractApproval.title')}</h2>
              <p className="text-sm text-neutral-400">
                {approval?.previous_contract
                  ? t('contractApproval.subtitleWithPrevious', {
                      previous: approval.previous_contract.version,
                      current: contract.version,
                    })
                  : t('contractApproval.subtitleNoPrevious')}
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

          <div className="mb-6 max-h-80 overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-blue-400" />
                <h3 className="truncate font-semibold text-white">{contract.title}</h3>
                <span className="shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                  v{contract.version} aktif
                </span>
              </div>
              {hasDiff && (
                <button
                  type="button"
                  onClick={() => setShowFullText((v) => !v)}
                  className="text-xs text-neutral-400 transition-colors hover:text-white"
                >
                  {showFullText
                    ? t('contractApproval.showDiff')
                    : t('contractApproval.showFullText')}
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
              {submitting ? t('contractApproval.requestingOtp') : t('contractApproval.requestOtp')}
            </button>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <p className="text-sm text-neutral-400 text-center">
                {t('contractApproval.verifySubtitle')}
              </p>

              <div className="mx-auto grid w-full max-w-[22rem] grid-cols-6 gap-2 sm:gap-3">
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
                    className="h-14 w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 text-center text-xl font-bold text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting || otpDigits.join('').length !== 6}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all disabled:opacity-70"
              >
                {submitting ? t('auth.otpLoading') : t('contractApproval.verifyTitle')}
              </button>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={submitting || resendCooldown > 0}
                className="w-full text-sm text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? t('contractApproval.resendIn', { seconds: resendCooldown })
                  : t('auth.resendCode')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
