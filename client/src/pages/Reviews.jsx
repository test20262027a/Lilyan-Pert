import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, EmptyState, Loading, SectionCard, Select, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { del, get, patch } from '../api';
import { fmtDateTime, fmtNumber, zoneFor } from '../format';
import { useBusiness } from '../context/BusinessContext';

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected'];

function Stars({ value }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: 'var(--accent-amber)' }} aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={14} style={{ opacity: i <= value ? 1 : 0.28 }} />
      ))}
    </span>
  );
}

/**
 * "Show more" appears only while the text is genuinely clipped at the current
 * viewport, language and font size — measured, not guessed — and is
 * recalculated when any of those change.
 */
function ClampedText({ text, t }) {
  const ref = useRef(null);
  const [clipped, setClipped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { locale } = useI18n();

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || expanded) return;
    setClipped(el.scrollHeight > el.clientHeight + 1);
  }, [expanded]);

  useLayoutEffect(() => {
    measure();
  }, [measure, text, locale]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [measure]);

  return (
    <div>
      <div ref={ref} className={`review-text ${expanded ? '' : 'is-clamped'}`}>
        {text}
      </div>
      {clipped || expanded ? (
        <button className="btn btn--ghost btn--sm" style={{ marginTop: 4 }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('review_show_less') : t('review_show_more')}
        </button>
      ) : null}
    </div>
  );
}

export default function Reviews() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const timeZone = zoneFor(locale, business?.timezone);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/manage/reviews?status=${status}`);
      setReviews(res.reviews || []);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

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

  const remove = async (id) => {
    setBusy(true);
    try {
      await del(`/manage/reviews/${id}`);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('review_title')}</h1>
          <p>{t('review_subtitle')}</p>
        </div>
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      <SectionCard
        icon="star"
        iconClass="ic-pink"
        title={t('review_title')}
        subtitle={`${fmtNumber(reviews.length, locale)} ${t('label_records')}`}
        actions={
          <div style={{ minWidth: 170 }}>
            <Select
              value={status}
              onChange={setStatus}
              aria-label={t('review_filter_status')}
              options={STATUS_OPTIONS.map((s) => ({
                value: s,
                label: s === 'all' ? t('label_all') : t(`review_${s}`),
              }))}
            />
          </div>
        }
      >
        {loading ? (
          <Loading />
        ) : reviews.length === 0 ? (
          <EmptyState icon="star" title={t('review_no_reviews')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((r) => (
              <article
                key={r.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 13,
                  background: 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {r.customer_name || t('review_customer')}
                      {r.order_number ? <span className="chip" style={{ marginInlineStart: 8 }}>#{r.order_number}</span> : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {fmtDateTime(r.created_at, locale, timeZone)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Stars value={r.rating} />
                    <span className={`badge badge--${r.status === 'approved' ? 'completed' : r.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                      {t(`review_${r.status}`)}
                    </span>
                  </div>
                </div>

                {r.comment ? (
                  <div style={{ marginTop: 8 }}>
                    <ClampedText text={r.comment} t={t} />
                  </div>
                ) : null}

                {isManager ? (
                  <div className="btn-row" style={{ marginTop: 10 }}>
                    {r.status !== 'approved' ? (
                      <button className="btn btn--sm btn--primary" disabled={busy} onClick={() => moderate(r.id, 'approved')}>
                        <Icon name="check" size={14} />
                        {t('review_approve')}
                      </button>
                    ) : null}
                    {r.status !== 'rejected' ? (
                      <button className="btn btn--sm" disabled={busy} onClick={() => moderate(r.id, 'rejected')}>
                        <Icon name="close" size={14} />
                        {t('review_reject')}
                      </button>
                    ) : null}
                    <button className="btn btn--sm btn--danger-soft" disabled={busy} onClick={() => remove(r.id)}>
                      <Icon name="trash" size={14} />
                      {t('action_delete')}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
