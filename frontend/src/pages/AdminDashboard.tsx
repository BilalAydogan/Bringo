import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import type { AdminContract, AdminDashboardResponse } from '../types/admin';
import { formatDateTime } from '../utils/date';
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Shield,
  UserCog,
  Users,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../utils/api';

type Tab = 'overview' | 'contracts' | 'admins';

const emptyContractForm = {
  title: '',
  content: '',
  titleEn: '',
  contentEn: '',
  version: '',
  is_required: true,
};

const emptyAdminUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyContractForm);
  const [editForm, setEditForm] = useState(emptyContractForm);
  const [adminForm, setAdminForm] = useState(emptyAdminUserForm);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminFormError, setAdminFormError] = useState('');
  const [adminFormSuccess, setAdminFormSuccess] = useState('');
  const { t, i18n } = useTranslation();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axiosInstance.get('/admin/dashboard');
      setData(response.data.data);
    } catch {
      setError(t('adminDashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard();
  }, [i18n.resolvedLanguage, i18n.language, loadDashboard]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.content.trim() || !createForm.version) return;

    setCreating(true);
    try {
      await axiosInstance.post('/admin/contracts', {
        title: createForm.title.trim(),
        content: createForm.content.trim(),
        version: parseFloat(createForm.version),
        is_required: createForm.is_required,
        translations:
          createForm.titleEn.trim() && createForm.contentEn.trim()
            ? [
              {
                locale: 'en',
                title: createForm.titleEn.trim(),
                content: createForm.contentEn.trim(),
              },
            ]
            : [],
      });
      setCreateForm(emptyContractForm);
      await loadDashboard();
      setTab('contracts');
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, t('adminDashboard.createError')));
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (contract: AdminContract) => {
    setEditingId(contract.id);
    setEditForm({
      title: contract.title,
      content: contract.content,
      titleEn:
        contract.translations?.find((translation) => translation.locale === 'en')?.title ?? '',
      contentEn:
        contract.translations?.find((translation) => translation.locale === 'en')?.content ?? '',
      version: contract.version.toString(),
      is_required: contract.is_required,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(emptyContractForm);
  };

  const handleUpdate = async (contractId: string) => {
    if (!editForm.title.trim() || !editForm.content.trim() || !editForm.version) return;

    setSavingId(contractId);
    try {
      await axiosInstance.put(`/admin/contracts/${contractId}`, {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        version: parseFloat(editForm.version),
        is_required: editForm.is_required,
        translations:
          editForm.titleEn.trim() && editForm.contentEn.trim()
            ? [{ locale: 'en', title: editForm.titleEn.trim(), content: editForm.contentEn.trim() }]
            : [],
      });
      await loadDashboard();
      setEditingId(null);
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, t('adminDashboard.updateError')));
    } finally {
      setSavingId(null);
    }
  };

  const handleActivate = async (contractId: string) => {
    setSavingId(contractId);
    try {
      await axiosInstance.post(`/admin/contracts/${contractId}/activate`);
      await loadDashboard();
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, t('adminDashboard.activateError')));
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setAdminFormError('');
    setAdminFormSuccess('');

    if (
      !adminForm.firstName.trim() ||
      !adminForm.lastName.trim() ||
      !adminForm.email.trim() ||
      !adminForm.password.trim()
    ) {
      setAdminFormError(t('adminDashboard.adminUserMissingFields'));
      return;
    }

    setCreatingAdmin(true);
    try {
      const response = await axiosInstance.post('/admin/users/admin', {
        firstName: adminForm.firstName.trim(),
        lastName: adminForm.lastName.trim(),
        email: adminForm.email.trim(),
        password: adminForm.password,
      });

      setAdminForm(emptyAdminUserForm);
      setAdminFormSuccess(response.data.message || t('adminDashboard.adminUserCreated'));
      await loadDashboard();
    } catch (error: unknown) {
      setAdminFormError(getApiErrorMessage(error, t('adminDashboard.adminUserCreateError')));
    } finally {
      setCreatingAdmin(false);
    }
  };

  const contracts = data?.contracts ?? [];
  const stats = data?.stats;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl pb-24">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5" />
              {t('adminDashboard.badge')}
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('adminDashboard.title')}
            </h2>
            <p className="text-neutral-400 mt-2">{t('adminDashboard.subtitle')}</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && !error && data && tab === 'overview' && (
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[28px] border border-neutral-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] p-4 sm:p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.08)_0%,transparent_34%,transparent_66%,rgba(34,197,94,0.06)_100%)]" />
              <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                      <Shield className="w-3.5 h-3.5" />
                      {t('adminDashboard.summaryBadge')}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1 text-[11px] font-medium text-neutral-300">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      {t('adminDashboard.liveSystem')}
                    </span>
                  </div>

                  <div className="max-w-3xl">
                    <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">
                      {t('adminDashboard.overviewLabel')}
                    </p>
                    <h3 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                      {t('adminDashboard.heroTitle')}
                    </h3>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
                      {t('adminDashboard.heroSubtitle')}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        label: t('adminDashboard.usersCardLabel'),
                        value: stats?.users ?? 0,
                        icon: Users,
                        note: t('adminDashboard.usersCardNote'),
                      },
                      {
                        label: t('adminDashboard.eventsCardLabel'),
                        value: stats?.events ?? 0,
                        icon: Activity,
                        note: t('adminDashboard.eventsCardNote'),
                      },
                      {
                        label: t('adminDashboard.contractsCardLabel'),
                        value: stats?.contracts ?? 0,
                        icon: CircleDollarSign,
                        note: t('adminDashboard.contractsCardNote'),
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                {item.label}
                              </p>
                              <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
                              <p className="mt-2 text-xs text-neutral-500">{item.note}</p>
                            </div>
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
                              <Icon className="w-5 h-5 text-amber-300" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        label: t('adminDashboard.adminsCardLabel'),
                        value: stats?.admins ?? 0,
                        tone: 'text-amber-300',
                        bar: 86,
                      },
                      {
                        label: t('adminDashboard.approvalsCardLabel'),
                        value: stats?.accepted_contracts ?? 0,
                        tone: 'text-emerald-300',
                        bar: 62,
                      },
                      {
                        label: t('adminDashboard.materialsCardLabel'),
                        value: stats?.items ?? 0,
                        tone: 'text-blue-300',
                        bar: 74,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-neutral-400">{item.label}</span>
                          <span className={`font-semibold ${item.tone}`}>{item.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400"
                            style={{ width: `${item.bar}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-neutral-500">
                          {t('adminDashboard.activeContractLabel')}
                        </p>
                        <p className="mt-1 text-xl font-semibold text-white">
                          {data.active_contract
                            ? data.active_contract.title
                            : t('adminDashboard.noActiveContract')}
                        </p>
                      </div>
                      {data.active_contract && (
                        <span className="inline-flex items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          v{data.active_contract.version}
                        </span>
                      )}
                    </div>

                    {data.active_contract ? (
                      <>
                        <p className="mt-4 text-sm leading-6 text-neutral-300 whitespace-pre-line line-clamp-6">
                          {data.active_contract.content}
                        </p>
                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                          <span className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-[11px] text-neutral-300">
                            {data.active_contract.is_required
                              ? t('adminDashboard.requiredContract')
                              : t('adminDashboard.optionalContract')}
                          </span>
                          <span className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-[11px] text-neutral-300">
                            {t('adminDashboard.acceptedShort', {
                              count: data.active_contract.accepted_count,
                            })}
                          </span>
                          <span className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-[11px] text-neutral-300">
                            {formatDateTime(data.active_contract.created_at)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="mt-4 text-sm text-neutral-400">
                        {t('adminDashboard.newVersionHint')}
                      </p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                          {t('adminDashboard.systemBalance')}
                        </h4>
                        <p className="mt-1 text-sm text-neutral-400">
                          {t('adminDashboard.quickSignals')}
                        </p>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {t('adminDashboard.instantView')}
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {[
                        {
                          label: t('adminDashboard.adminRatio'),
                          value: stats?.admins ?? 0,
                          tone: 'text-amber-300',
                          bar: 86,
                        },
                        {
                          label: t('adminDashboard.approvedContracts'),
                          value: stats?.accepted_contracts ?? 0,
                          tone: 'text-emerald-300',
                          bar: 62,
                        },
                        {
                          label: t('adminDashboard.materialsRecord'),
                          value: stats?.items ?? 0,
                          tone: 'text-blue-300',
                          bar: 74,
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-neutral-400">{item.label}</span>
                            <span className={`font-semibold ${item.tone}`}>{item.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-neutral-800">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400"
                              style={{ width: `${item.bar}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('adminDashboard.recentUsers')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      {t('adminDashboard.recentUsersSubtitle')}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {t('adminDashboard.records', { count: data.recent_users?.length ?? 0 })}
                  </span>
                </div>
                <div className="space-y-3">
                  {(data.recent_users ?? []).map((user) => {
                    const initials =
                      `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim() || 'U';
                    const isAdmin = (user.roles ?? []).includes('ROLE_ADMIN');

                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/60 px-3 py-3"
                      >
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold ${isAdmin ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-neutral-700 bg-neutral-900 text-neutral-200'}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="truncate text-xs text-neutral-400">{user.email}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${isAdmin ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}
                        >
                          {isAdmin ? t('adminDashboard.adminRole') : t('adminDashboard.userRole')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('adminDashboard.contractSummary')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      {t('adminDashboard.contractSummarySubtitle')}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {t('adminDashboard.records', { count: contracts.length })}
                  </span>
                </div>
                <div className="space-y-3">
                  {contracts.slice(0, 4).map((contract) => (
                    <div
                      key={contract.id}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {contract.title}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            v{contract.version} •{' '}
                            {t('adminDashboard.acceptedShort', { count: contract.accepted_count })}
                          </p>
                        </div>
                        {contract.is_active ? (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                            {t('adminDashboard.active')}
                          </span>
                        ) : (
                          <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-300">
                            {t('adminDashboard.archive')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && data && tab === 'admins' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {t('adminDashboard.adminUserTitle')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    {t('adminDashboard.adminUserSubtitle')}
                  </p>
                </div>
                <span className="text-xs text-neutral-500">
                  {t('adminDashboard.adminUserHint')}
                </span>
              </div>

              {adminFormError && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {adminFormError}
                </div>
              )}

              {adminFormSuccess && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {adminFormSuccess}
                </div>
              )}

              <form className="mt-4 space-y-3" onSubmit={handleCreateAdmin}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={adminForm.firstName}
                    onChange={(e) =>
                      setAdminForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder={t('adminDashboard.adminFirstNamePlaceholder')}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/50"
                  />
                  <input
                    type="text"
                    value={adminForm.lastName}
                    onChange={(e) =>
                      setAdminForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder={t('adminDashboard.adminLastNamePlaceholder')}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/50"
                  />
                </div>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t('adminDashboard.adminEmailPlaceholder')}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/50"
                />
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t('adminDashboard.adminPasswordPlaceholder')}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
                >
                  {creatingAdmin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  {creatingAdmin
                    ? t('adminDashboard.creatingAdmin')
                    : t('adminDashboard.createAdmin')}
                </button>
              </form>
            </div>
          </div>
        )}

        {!loading && !error && data && tab === 'contracts' && (
          <div className="space-y-6">
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-5"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{t('adminDashboard.newContract')}</h3>
                  <p className="text-sm text-neutral-400">
                    {t('adminDashboard.newContractSubtitle')}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:opacity-60 sm:w-auto"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {creating ? t('adminDashboard.creating') : t('adminDashboard.create')}
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t('adminDashboard.titlePlaceholder')}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={createForm.version}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, version: e.target.value }))}
                  placeholder={t('adminDashboard.versionPlaceholder')}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <textarea
                value={createForm.content}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder={t('adminDashboard.contentPlaceholder')}
                rows={8}
                className="mt-4 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 resize-y"
              />
              <div className="mt-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t('adminDashboard.translationSection')}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={createForm.titleEn}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, titleEn: e.target.value }))
                    }
                    placeholder={t('adminDashboard.translationTitlePlaceholder')}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                  />
                  <div className="md:col-span-2">
                    <textarea
                      value={createForm.contentEn}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, contentEn: e.target.value }))
                      }
                      placeholder={t('adminDashboard.translationContentPlaceholder')}
                      rows={8}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 resize-y"
                    />
                  </div>
                </div>
              </div>
              <label className="mt-4 inline-flex items-center gap-3 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={createForm.is_required}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, is_required: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-500"
                />
                {t('adminDashboard.requiredLabel')}
              </label>
            </form>

            <div className="space-y-3">
              {contracts.map((contract) => {
                const isEditing = editingId === contract.id;
                const isSaving = savingId === contract.id;

                return (
                  <div
                    key={contract.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-white">{contract.title}</p>
                          {contract.is_active && (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                              {t('adminDashboard.active')}
                            </span>
                          )}
                          {contract.is_required && (
                            <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
                              {t('adminDashboard.requiredLabel')}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-neutral-400">
                          v{contract.version} •{' '}
                          {t('adminDashboard.acceptedShort', { count: contract.accepted_count })} •{' '}
                          {formatDateTime(contract.created_at)}
                        </p>

                        {isEditing ? (
                          <div className="mt-4 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                                }
                                className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                              />
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={editForm.version}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, version: e.target.value }))
                                }
                                className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                              />
                            </div>
                            <textarea
                              value={editForm.content}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, content: e.target.value }))
                              }
                              rows={8}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 resize-y"
                            />
                            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-4">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                {t('adminDashboard.translationSection')}
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                  type="text"
                                  value={editForm.titleEn}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, titleEn: e.target.value }))
                                  }
                                  placeholder={t('adminDashboard.translationTitlePlaceholder')}
                                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                                />
                                <div className="md:col-span-2">
                                  <textarea
                                    value={editForm.contentEn}
                                    onChange={(e) =>
                                      setEditForm((prev) => ({
                                        ...prev,
                                        contentEn: e.target.value,
                                      }))
                                    }
                                    rows={8}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 resize-y"
                                  />
                                </div>
                              </div>
                            </div>
                            <label className="inline-flex items-center gap-3 text-sm text-neutral-300">
                              <input
                                type="checkbox"
                                checked={editForm.is_required}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    is_required: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-amber-500"
                              />
                              {t('adminDashboard.requiredLabel')}
                            </label>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-neutral-300 whitespace-pre-line line-clamp-5">
                            {contract.content}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="px-3 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                            >
                              {t('adminDashboard.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdate(contract.id)}
                              disabled={isSaving}
                              className="px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-60"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                t('adminDashboard.save')
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(contract)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              {t('adminDashboard.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleActivate(contract.id)}
                              disabled={contract.is_active || isSaving}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors disabled:opacity-60"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                              {t('adminDashboard.activate')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error && data && contracts.length === 0 && tab === 'contracts' && (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/60 p-8 text-center text-neutral-400">
            {t('adminDashboard.noContracts')}
          </div>
        )}

        <div className="mt-8">
          <Link to="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
            {t('common.backToHome')}
          </Link>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
            {[
              { key: 'overview' as const, label: t('adminDashboard.bottomNav.overview'), icon: BarChart3 },
              { key: 'contracts' as const, label: t('adminDashboard.bottomNav.contracts'), icon: FileText },
              { key: 'admins' as const, label: t('adminDashboard.bottomNav.admins'), icon: UserCog },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium transition-colors ${isActive
                      ? 'bg-neutral-100 text-neutral-950 shadow-lg shadow-black/20'
                      : 'bg-neutral-900 text-neutral-400'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-amber-600' : 'text-neutral-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
