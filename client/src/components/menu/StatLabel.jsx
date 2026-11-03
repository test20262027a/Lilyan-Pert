import { useI18n } from '../../i18n';

/*
 * One statistics card title, in three localized lengths.
 *
 * All three are rendered; CSS decides which one is visible, so the switch costs
 * no re-render and follows the card's own width rather than the viewport — a
 * narrow modal on a wide desktop gets the short form, a roomy card on a phone
 * keeps the full one. The rules live in `statCards.css`.
 *
 *   full    — the original localized title (never abbreviated)
 *   compact — a concise localized form for tight cards
 *   short   — the shortest meaningful form for small screens
 */
export default function StatLabel({ fullKey, compactKey, shortKey }) {
  const { t } = useI18n();

  return (
    <span className="stat-label">
      <span className="stat-label__text stat-label__text--full">{t(fullKey)}</span>
      <span className="stat-label__text stat-label__text--compact">{t(compactKey)}</span>
      <span className="stat-label__text stat-label__text--short">{t(shortKey)}</span>
    </span>
  );
}
