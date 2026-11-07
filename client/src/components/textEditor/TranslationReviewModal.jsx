import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui';
import ModalActions from '../ModalActions';
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
  const { t, enabledLanguages } = useI18n();
  const [selected, setSelected] = useState({});

  // A disabled language is never offered — the review lists only what the menu
  // can actually print, so no empty language block appears here either.
  const enabledKey = enabledLanguages.join(',');
  const targets = useMemo(
    () => TARGETS.filter((target) => enabledKey.split(',').includes(target.code)),
    [enabledKey],
  );

  useEffect(() => {
    setSelected(
      Object.fromEntries(targets.map((target) => [target.code, !occupied.includes(target.code)])),
    );
  }, [occupied, targets]);

  const toggle = (code) => setSelected((s) => ({ ...s, [code]: !s[code] }));
  const chosen = targets.filter((target) => selected[target.code]).map((target) => target.code);

  return (
    <Modal
      title={t('text_editor_translate_review')}
      subtitle={t('text_editor_translate_review_hint')}
      onClose={onClose}
      footer={
        <ModalActions
          primaryLabel={t('text_editor_translate_apply')}
          primaryIcon="check"
          onPrimary={() => onApply(chosen)}
          primaryDisabled={!chosen.length}
          secondaryLabel={t('action_cancel')}
          onSecondary={onClose}
        />
      }
    >
      <div className="tx-review">
        {targets.map((target) => (
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
