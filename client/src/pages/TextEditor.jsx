import { useCallback, useEffect, useMemo, useState } from 'react';
import { post } from '../api';
import Icon from '../components/Icon';
import { EmptyState, useToast } from '../components/ui';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import TextEditorArtwork from '../components/textEditor/TextEditorArtwork';
import ReceiptMessageRow from '../components/textEditor/ReceiptMessageRow';
import TranslationReviewModal from '../components/textEditor/TranslationReviewModal';
import {
  MESSAGE_LOCALES,
  RECEIPT_MESSAGES,
  isCustomMessage,
  receiptMessageValues,
  storedMessages,
} from '../receiptMessages';
import '../textEditor.css';

/*
 * Text Editor — the fifteen automatic receipt messages.
 *
 * One draft object keyed by message key and language is the only editing
 * state: the search box, the accordion and the translation action never own a
 * copy of the text, so none of them can drop a pending edit. The header Save
 * writes just the messages that changed into the business's existing
 * `editable_text.receipt_messages` overrides, and the receipt renderer reads
 * the same resolution (override → legacy footer → default) while printing.
 */

const ROWS = RECEIPT_MESSAGES.map((message, index) => ({ ...message, number: index + 1 }));

/** The values a message shows today, defaults included. */
function draftFrom(business) {
  return Object.fromEntries(ROWS.map((row) => [row.key, receiptMessageValues(business, row.key)]));
}

const EMPTY = Object.fromEntries(MESSAGE_LOCALES.map((code) => [code, '']));

export default function TextEditor() {
  const { t, enabledLanguages } = useI18n();
  const { business, loading, save, reload } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();

  const baseline = useMemo(() => draftFrom(business), [business]);
  const [draft, setDraft] = useState(() => draftFrom(business));
  const [openKeys, setOpenKeys] = useState(() => new Set([ROWS[0].key]));
  const [groupOpen, setGroupOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [translating, setTranslating] = useState(null);
  const [review, setReview] = useState(null);

  // A saved record or a reloaded business refreshes both draft and baseline.
  useEffect(() => {
    setDraft(draftFrom(business));
    setConflict(false);
  }, [business]);

  // Typing filters after the input settles; the drafts are never touched.
  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim().toLowerCase()), 180);
    return () => clearTimeout(id);
  }, [query]);

  const changed = useMemo(
    () =>
      ROWS.filter((row) =>
        MESSAGE_LOCALES.some(
          (code) => (draft?.[row.key]?.[code] || '') !== (baseline?.[row.key]?.[code] || ''),
        ),
      ).map((row) => row.key),
    [draft, baseline],
  );
  const dirty = changed.length > 0;

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const visible = useMemo(() => {
    if (!search) return ROWS;
    return ROWS.filter((row) => {
      const values = draft?.[row.key] || EMPTY;
      const padded = String(row.number).padStart(2, '0');
      const haystack = [
        padded,
        String(row.number),
        row.key,
        t('text_editor_message_title', { n: padded }),
        isCustomMessage(business, row.key) ? t('text_editor_custom') : t('text_editor_standard'),
        ...MESSAGE_LOCALES.map((code) => values[code] || ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [search, draft, business, t]);

  const toggleRow = useCallback((key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setValue = useCallback((key, code, value) => {
    setDraft((current) => ({ ...current, [key]: { ...(current[key] || EMPTY), [code]: value } }));
  }, []);

  const saveAll = async () => {
    if (busy || !isManager || !dirty) return;
    setBusy(true);
    try {
      const next = { ...storedMessages(business) };
      for (const key of changed) {
        const values = Object.fromEntries(
          MESSAGE_LOCALES.map((code) => [code, String(draft[key]?.[code] || '').trim()]),
        );
        // An emptied message drops its override so the default prints again.
        if (MESSAGE_LOCALES.every((code) => !values[code])) delete next[key];
        else next[key] = values;
      }
      await save({
        editable_text: { ...(business?.editable_text || {}), receipt_messages: next },
        // Optimistic guard: refuse to overwrite a newer edit of the same record.
        expected_updated_at: business?.updated_at,
      });
      toast.success(t('state_saved'));
    } catch (err) {
      if (err?.code === 'STALE_BUSINESS') setConflict(true);
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const reloadLatest = async () => {
    await reload();
    setConflict(false);
  };

  const translate = async (key) => {
    const source = String(draft?.[key]?.ku || '').trim();
    if (!source) {
      toast.error(t('text_editor_translate_empty'));
      return;
    }
    setTranslating(key);
    try {
      const result = await post('/text/translate', { text: source });
      const values = result?.translations || {};
      // Only the languages the owner enabled are offered for translation.
      const occupied = enabledLanguages
        .filter((code) => code !== 'ku')
        .filter((code) => String(draft?.[key]?.[code] || '').trim());
      setReview({ key, values, occupied });
    } catch (err) {
      const code = err?.code;
      if (code === 'TRANSLATION_NOT_CONFIGURED') toast.error(t('text_editor_translate_unavailable'));
      else if (code === 'PLACEHOLDER_MISSING') toast.error(t('text_editor_translate_placeholder'));
      else toast.error(t('text_editor_translate_failed'));
    } finally {
      setTranslating(null);
    }
  };

  const applyTranslations = (codes) => {
    if (review) {
      setDraft((current) => ({
        ...current,
        [review.key]: {
          ...(current[review.key] || EMPTY),
          ...Object.fromEntries(codes.map((code) => [code, review.values?.[code] || ''])),
        },
      }));
      toast.success(t('text_editor_translate_applied'));
    }
    setReview(null);
  };

  const total = ROWS.length;
  const ready = Boolean(business) && !loading;

  return (
    <div className="tx-page">
      <div className="tx-hero">
        <PageHeroBanner
          icon="type"
          title={t('text_editor_title')}
          subtitle={t('text_editor_subtitle')}
          art={<TextEditorArtwork />}
        >
          {dirty ? (
            <span className="tx-unsaved" title={t('settings_unsaved_hint')}>
              <Icon name="alert" size={12} />
              {t('settings_unsaved')}
            </span>
          ) : null}
          <button
            type="button"
            className="tx-save"
            onClick={saveAll}
            disabled={!isManager || busy || !dirty}
            title={dirty ? t('settings_unsaved_hint') : t('action_save')}
          >
            {busy ? <span className="spinner" /> : <Icon name="check" size={15} />}
            {t('action_save')}
          </button>
        </PageHeroBanner>
      </div>

      {!isManager ? (
        <p className="tx-notice">
          <Icon name="info" size={15} />
          {t('user_view_only')}
        </p>
      ) : null}

      {conflict ? (
        <div className="tx-conflict" role="alert">
          <Icon name="alert" size={17} />
          <div className="tx-conflict__text">
            <b>{t('text_editor_conflict')}</b>
            <span>{t('text_editor_conflict_hint')}</span>
          </div>
          <button type="button" className="btn btn--sm" onClick={reloadLatest}>
            <Icon name="refresh" size={14} />
            {t('text_editor_reload')}
          </button>
        </div>
      ) : null}

      <div className="tx-search lilyan-search">
        <span className="lilyan-search__icon">
          <Icon name="search" size={15} />
        </span>
        <input
          type="search"
          className="tx-search__input lilyan-search__input"
          value={query}
          disabled={!ready}
          placeholder={t('text_editor_search')}
          aria-label={t('text_editor_search')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {!ready ? (
        <div className="tx-group tx-skeleton" aria-hidden="true">
          <div className="tx-skeleton__head" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="tx-skeleton__row" key={i} />
          ))}
        </div>
      ) : (
        <section className="tx-group">
          <div className="tx-group__head">
            <button
              type="button"
              className="tx-group__toggle"
              aria-expanded={groupOpen}
              aria-controls="tx-group-body"
              onClick={() => setGroupOpen((v) => !v)}
            >
              <span className="tx-group__icon">
                <Icon name="receipt" size={16} />
              </span>
              <span className="tx-group__title">{t('text_editor_group')}</span>
              <span className="tx-group__count">{t('text_editor_count', { count: total })}</span>
              <span className={`tx-group__chevron ${groupOpen ? 'is-open' : ''}`} aria-hidden="true">
                <Icon name="chevronDown" size={16} />
              </span>
            </button>
          </div>

          {groupOpen ? (
            <div className="tx-group__body" id="tx-group-body">
              {visible.length ? (
                visible.map((row) => (
                  <ReceiptMessageRow
                    key={row.key}
                    number={row.number}
                    open={openKeys.has(row.key)}
                    onToggle={() => toggleRow(row.key)}
                    values={draft?.[row.key] || EMPTY}
                    custom={isCustomMessage(business, row.key)}
                    dirty={changed.includes(row.key)}
                    canManage={isManager}
                    onChange={(code, value) => setValue(row.key, code, value)}
                    onTranslate={() => translate(row.key)}
                    translating={translating === row.key}
                  />
                ))
              ) : (
                <EmptyState icon="search" title={t('text_editor_empty_search')} hint={t('text_editor_empty_search_hint')} />
              )}
            </div>
          ) : null}
        </section>
      )}

      {review ? (
        <TranslationReviewModal
          values={review.values}
          occupied={review.occupied}
          onApply={applyTranslations}
          onClose={() => setReview(null)}
        />
      ) : null}
    </div>
  );
}
