import './languageGrid.css';

/*
 * The one responsive grid every multilingual form uses.
 *
 * `count` is the number of languages the owner actually has enabled, so the
 * layout is planned from real content instead of a fixed column count: one
 * language fills the row, two sit side by side, three use three columns when
 * the form is wide enough (otherwise two, with the last card spanning the row),
 * and four make a clean two-by-two block.
 *
 * The grid measures its own container, not the browser window, because these
 * forms live inside modals of very different widths.
 */
export default function LanguageFieldsGrid({ count, variant = 'cards', className = '', children }) {
  const items = Math.max(1, Number(count) || 1);
  return (
    <div className={`lang-grid-host ${className}`.trim()} data-langs={items} data-variant={variant}>
      <div className="lang-grid">{children}</div>
    </div>
  );
}
