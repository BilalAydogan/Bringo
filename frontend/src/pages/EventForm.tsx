import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axios';
import AppLayout from '../components/AppLayout';
import { datetimeLocalToIso, toDatetimeLocalValue } from '../utils/date';
import { ArrowLeft, Loader2, MapPin, Calendar, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../utils/api';

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (!isEdit || !id) return;

    axiosInstance
      .get(`/events/${id}`)
      .then((response) => {
        const event = response.data.data;
        setTitle(event.title);
        setDescription(event.description ?? '');
        setDate(toDatetimeLocalValue(event.date));
        setLocation(event.location ?? '');
      })
      .catch((error: unknown) => {
        setError(getApiErrorMessage(error, t('eventForm.loadError')));
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);

    const payload = {
      title,
      description: description || null,
      date: datetimeLocalToIso(date),
      location: location || null,
    };

    try {
      if (isEdit && id) {
        await axiosInstance.put(`/events/${id}`, payload);
        navigate(`/events/${id}`);
      } else {
        const response = await axiosInstance.post('/events', payload);
        navigate(`/events/${response.data.data.id}`);
      }
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, t('eventForm.submitError')));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <Link
          to={isEdit && id ? `/events/${id}` : '/'}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('eventForm.back')}
        </Link>

        <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
          {isEdit ? t('eventForm.editTitle') : t('eventForm.createTitle')}
        </h2>
        <p className="text-neutral-400 mb-8">
          {isEdit ? t('eventForm.editSubtitle') : t('eventForm.createSubtitle')}
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {t('eventForm.titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
              className="block w-full px-4 py-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
              placeholder={t('eventForm.titlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {t('eventForm.descriptionLabel')}
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-neutral-500" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={5000}
                className="block w-full pl-12 pr-4 py-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none"
                placeholder={t('eventForm.descriptionPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {t('eventForm.dateLabel')}
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="block w-full pl-12 pr-4 py-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              {t('eventForm.locationLabel')}
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={255}
                className="block w-full pl-12 pr-4 py-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                placeholder={t('eventForm.locationPlaceholder')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 transition-all disabled:opacity-70"
          >
            {submitting
              ? t('eventForm.saving')
              : isEdit
                ? t('eventForm.submitEdit')
                : t('eventForm.submitCreate')}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
