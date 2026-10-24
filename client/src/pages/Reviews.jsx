import { useCallback, useEffect, useState } from 'react';
import { Alert, EmptyState, useToast } from '../components/ui';
import DeleteConfirmationDialog from '../components/confirm/DeleteConfirmationDialog';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import ReviewsArtwork from '../components/reviews/ReviewsArtwork';
import RatingOverview from '../components/reviews/RatingOverview';
import ReviewCard from '../components/reviews/ReviewCard';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { del, get, patch } from '../api';
import { zoneFor } from '../format';
import '../menu.css';
import '../reviews.css';

/*
 * Reviews & Feedback.
 *
 * The illustrated banner, the full-width ratings overview and the vertical list
 * of real customer reviews of the signed-in business. `/manage/reviews` returns
 * the page of reviews, the total and one server-computed summary (average plus
 * the five counts), so the overview can never disagree with the list. Deleting
 * goes through the business-scoped delete route and the page is reloaded from
 * the API afterwards — the UI never removes a card the backend still holds.
 */

const PAGE_SIZE = 20;

/** A short, single-line excerpt of the review, for the confirmation preview. */
function excerpt(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
}

export default function Reviews() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/manage/reviews?limit=${PAGE_SIZE}&offset=0`);
      setReviews(res.reviews || []);
      setSummary(res.summary || null);
      setTotal(Number(res.total) || 0);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await get(`/manage/reviews?limit=${PAGE_SIZE}&offset=${reviews.length}`);
      setReviews((current) => [...current, ...(res.reviews || [])]);
      setSummary(res.summary || null);
      setTotal(Number(res.total) || 0);
    } catch {
      toast.error(t('review_load_error'));
    } finally {
      setLoadingMore(false);
    }
  };

  const moderate = async (id, next) => {
    setBusy(true);
    try {
      await patch(`/manage/reviews/${id}`, { status: next });
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await del(`/manage/reviews/${confirm.id}`);
      setConfirm(null);
      await load();
      toast.success(t('review_deleted'));
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const hasMore = total > reviews.length;

  return (
    <div className="reviews-page">
      <PageHeroBanner
        icon="star"
        title={t('review_title')}
        subtitle={t('review_subtitle')}
        art={<ReviewsArtwork />}
      />

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      {loading ? (
        <>
          <div className="rv-overview rv-overview--skeleton" aria-hidden="true">
            <div className="rv-skel rv-skel--summary">
              <span className="rv-skel__line" style={{ width: 74, height: 34 }} />
              <span className="rv-skel__line" style={{ width: 96, height: 14 }} />
              <span className="rv-skel__line" style={{ width: 62, height: 11 }} />
            </div>
            <div className="rv-skel rv-skel--rows">
              {[0, 1, 2, 3, 4].map((row) => (
                <span className="rv-skel__line" key={row} style={{ height: 8 }} />
              ))}
            </div>
          </div>
          <div className="rv-list" aria-hidden="true">
            {[0, 1, 2].map((card) => (
              <div className="rv-card rv-card--skeleton" key={card}>
                <span className="rv-skel__line" style={{ width: 120, height: 13 }} />
                <span className="rv-skel__line" style={{ width: 88, height: 12, marginTop: 8 }} />
                <span className="rv-skel__line" style={{ width: '78%', height: 12, marginTop: 10 }} />
              </div>
            ))}
          </div>
        </>
      ) : failed ? (
        <Alert kind="error">
          {t('review_load_error')}{' '}
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : (
        <>
          <RatingOverview summary={summary} locale={locale} />

          {reviews.length === 0 ? (
            <EmptyState icon="star" title={t('review_empty')} hint={t('review_empty_hint')} />
          ) : (
            <div className="rv-list">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  locale={locale}
                  timeZone={timeZone}
                  canManage={isManager}
                  busy={busy}
                  onDelete={setConfirm}
                  onModerate={moderate}
                />
              ))}
            </div>
          )}

          {hasMore ? (
            <button type="button" className="rv-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <span className="spinner" /> : null}
              {t('review_load_more')}
            </button>
          ) : null}
        </>
      )}

      {confirm ? (
        <DeleteConfirmationDialog
          entityType="review"
          entityName={String(confirm.customer_name || '').trim() || t('review_customer')}
          entitySubtitle={excerpt(confirm.comment)}
          warning={t('review_delete_message')}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
