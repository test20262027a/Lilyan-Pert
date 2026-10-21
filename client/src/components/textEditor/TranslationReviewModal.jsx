import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { Modal } from '../ui';
import { useI18n } from '../../i18n';

/*
 * Shows what the translation action produced before anything reaches the
 * draft. A language that already carries text is listed as a replacement and
 * starts unchecked, so an existing manual translation is never overwritten
 * without an explicit choice.
 */

const TARGETS = [
  { code: 'fa', label: 'فارسی', rtl: true },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'en', label: 'English', rtl: false },
];

export default function TranslationReviewModal({ values, occupied, onApply, onClose }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState({});

  useEffect(() => {
    setSelected({
      fa: !occupied.includes('fa'),
      ar: !occupied.includes('ar'),
      en: !occupied.includes('en'),
    });
  }, [occupied]);

  const toggle = (code) => setSelected((s) => ({ ...s, [code]: !s[code] }));
  const chosen = TARGETS.filter((target) => selected[target.code]).map((target) => target.code);

  return (
    <Modal
      title={t('text_editor_translate_review')}
      subtitle={t('text_editor_translate_review_hint')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {t('action_cancel')}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onApply(chosen)} disabled={!chosen.length}>
            <Icon name="check" size={15} />
            {t('text_editor_translate_apply')}
          </button>
        </>
      }
    >
      <div className="tx-review">
        {TARGETS.map((target) => (
          <label className={`tx-review__item ${occupied.includes(target.code) ? 'is-replace' : ''}`} key={target.code}>
            <span className="tx-review__head">
              <input type="checkbox" checked={Boolean(selected[target.code])} onChange={() => toggle(target.code)} />
              <span className="tx-review__lang">{target.label}</span>
              {occupied.includes(target.code) ? (
                <span className="tx-review__warn">{t('text_editor_translate_replace')}</span>
              ) : null}
            </span>
            <span className="tx-review__text" dir={target.rtl ? 'rtl' : 'ltr'}>
              {values?.[target.code] || ''}
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
