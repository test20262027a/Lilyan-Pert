import { useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Icon from '../Icon';
import { useI18n, localized } from '../../i18n';
import { appearanceOf } from './categoryIcons';
import CategoryIdentityIcon from './CategoryIdentityIcon';
import CategoryRow from './CategoryRow';
import StatLabel from './StatLabel';
import { fmtNumber } from '../../format';
import { moveId, useReorderSensors } from './reorder';

/*
 * The three category counters in display order: each names its own colour
 * family (`kind`), glyph, the figure it reads from the server summary, and the
 * three localized lengths of its title.
 */
const COUNTERS = [
  {
    kind: 'total',
    glyph: 'layers',
    value: 'total',
    fullKey: 'menu_total_categories',
    compactKey: 'menu_total_categories_compact',
    shortKey: 'menu_total_categories_short',
  },
  {
    kind: 'active',
    glyph: 'checkCircle',
    value: 'active',
    fullKey: 'menu_active_categories',
    compactKey: 'menu_active_categories_compact',
    shortKey: 'menu_active_categories_short',
  },
  {
    kind: 'inactive',
    glyph: 'xCircle',
    value: 'inactive',
    fullKey: 'menu_inactive_categories',
    compactKey: 'menu_inactive_categories_compact',
    shortKey: 'menu_inactive_categories_short',
  },
];

/*
 * The category management panel: heading, the three compact statistic cards and
 * the selectable category list. Only the list scrolls, so the heading, the
 * counters and the reorder hint stay put while long menus are browsed.
 *
 * The list never carries an independent active/inactive switch — status is
 * edited inside the create/edit form only.
 *
 * Every row renders the category's own saved icon (`categoryIcons` maps that key
 * to a glyph and a pastel container), so each category keeps its identity
 * instead of sharing one generic symbol.
 *
 * Ordering is level 1 of the menu's two independent levels: dragging a row
 * rewrites the category sequence (and with it every customer menu), while the
 * products inside each category keep their own saved order untouched.
 */
export default function CategoryPanel({
  categories,
  stats,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
  reorderable = false,
  reorderBlocked = false,
  canManage,
  className = '',
}) {
  const { t, locale } = useI18n();
  const sensors = useReorderSensors();
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  // The header identity follows the selected row: its own saved glyph and
  // accent, or the neutral Categories glyph while nothing is selected.
  const selected = categories.find((c) => c.id === selectedId) || null;
  const appearance = selected ? appearanceOf(selected) : null;

  const ids = categories.map((c) => c.id);
  const active = categories.find((c) => c.id === activeId) || null;
  const activeAppearance = active ? appearanceOf(active) : null;

  const moveTo = (index, to) => {
    if (!onReorder || to < 0 || to > ids.length - 1) return;
    const next = ids.slice();
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  const end = ({ active: dragged, over }) => {
    setActiveId(null);
    setOverId(null);
    if (!over || !onReorder || !reorderable) return;
    const next = moveId(ids, dragged.id, over.id);
    if (next) onReorder(next);
  };

  const list = (
    <ul className="mclist">
      {categories.map((c, index) => (
        <CategoryRow
          key={c.id}
          category={c}
          selected={c.id === selectedId}
          canManage={canManage}
          reorderable={reorderable}
          dropTarget={Boolean(overId) && overId === c.id && overId !== activeId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onMoveUp={reorderable && onReorder && index > 0 ? () => moveTo(index, index - 1) : null}
          onMoveDown={
            reorderable && onReorder && index < ids.length - 1
              ? () => moveTo(index, index + 1)
              : null
          }
        />
      ))}
    </ul>
  );

  return (
    <section className={`mpanel ${className}`.trim()}>
      {/*
       * Heading at the inline start and its icon in the opposite far corner
       * (physical right / physical left under RTL, mirrored in LTR), both
       * vertically centred on the same line.
       */}
      <header className="mpanel__head">
        <div className="mpanel__text">
          <h2 className="mpanel__title">{t('menu_tab_categories')}</h2>
          <p className="mpanel__sub">{t('menu_categories_hint')}</p>
        </div>
        {appearance ? (
          <CategoryIdentityIcon
            icon={appearance.icon}
            color={appearance.color}
            size={46}
            variant="raised"
          />
        ) : (
          <span className="mpanel__icon">
            <Icon name="layers" size={22} />
          </span>
        )}
      </header>

      <div className="mcstats">
        {COUNTERS.map(({ kind, glyph, value, fullKey, compactKey, shortKey }) => (
          <div key={kind} className={`mcstat mcstat--${kind}`}>
            <span className="mcstat__top">
              <span className="stat-ico">
                <Icon name={glyph} size={14} />
              </span>
              <span className="mcstat__value">{fmtNumber(stats[value], locale)}</span>
            </span>
            <StatLabel fullKey={fullKey} compactKey={compactKey} shortKey={shortKey} />
          </div>
        ))}
      </div>

      {/* Why dragging is unavailable right now — never a silent, broken grip. */}
      {reorderBlocked ? (
        <p className="mreorder-hint mreorder-hint--blocked">{t('menu_reorder_search_locked')}</p>
      ) : null}

      {categories.length === 0 ? (
        <div className="empty">
          <span className="empty__icon">
            <Icon name="layers" size={20} />
          </span>
          <span className="empty__title">{t('menu_no_categories')}</span>
        </div>
      ) : (
        /*
         * The drag context always wraps the list so every row has one; whether
         * a drag may actually start is decided per row by `reorderable` (search
         * results are only part of the categories and must not be reordered).
         */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active: dragged }) => setActiveId(dragged.id)}
          onDragOver={({ over }) => setOverId(over ? over.id : null)}
          onDragCancel={() => {
            setActiveId(null);
            setOverId(null);
          }}
          onDragEnd={end}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {active ? (
              <div className="mrow mrow--ghost">
                <span className="mrow__handle">
                  <Icon name="gripVertical" size={15} />
                </span>
                <CategoryIdentityIcon
                  icon={activeAppearance.icon}
                  color={activeAppearance.color}
                  size={34}
                />
                <span className="mrow__name">{localized(active, 'name', locale) || t('label_translation_missing')}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
