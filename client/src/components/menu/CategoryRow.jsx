import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '../Icon';
import { useI18n, localized } from '../../i18n';
import { appearanceOf } from './categoryIcons';
import CategoryIdentityIcon from './CategoryIdentityIcon';

/*
 * One category row in the management list.
 *
 * The row owns three things at once and keeps them independent:
 *   · selection — the large button around the glyph and the name;
 *   · management — the pencil and the trash can at the inline end;
 *   · order — the grip at the inline start, which is the *only* drag activator,
 *     so a drag never selects, edits or deletes anything by accident.
 *
 * An inactive category is drawn softly (faded surface, desaturated glyph, muted
 * name, quieter elevation) without losing any contrast or any control: edit,
 * delete, status and reordering all stay available.
 */
export default function CategoryRow({
  category,
  selected,
  canManage,
  reorderable,
  dropTarget = false,
  onSelect,
  onEdit,
  onDelete,
  onMoveUp = null,
  onMoveDown = null,
}) {
  const { t, locale } = useI18n();
  const name = localized(category, 'name', locale);
  const appearance = appearanceOf(category);
  const inactive = category.active === false;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !reorderable });

  const className = [
    'mrow',
    selected ? 'is-selected' : '',
    inactive ? 'is-inactive' : '',
    isDragging ? 'is-dragging' : '',
    dropTarget ? 'is-drop-target' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li
      ref={setNodeRef}
      className={className}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {reorderable ? (
        <button
          type="button"
          className="mrow__handle"
          ref={setActivatorNodeRef}
          aria-label={t('menu_reorder_handle')}
          title={t('menu_reorder_handle')}
          {...attributes}
          {...listeners}
        >
          <Icon name="gripVertical" size={15} />
        </button>
      ) : null}

      {/* Selecting happens on the row itself, never on the pencil. */}
      <button
        type="button"
        className="mrow__pick"
        aria-pressed={selected}
        onClick={() => onSelect(category.id)}
      >
        <CategoryIdentityIcon icon={appearance.icon} color={appearance.color} size={34} />
        <span className="mrow__name" title={name}>
          {name}
        </span>
        {inactive ? (
          <span className="mrow__status" title={t('label_inactive')} aria-label={t('label_inactive')} />
        ) : null}
      </button>

      <div className="mrow__actions">
        {onMoveUp || onMoveDown ? (
          <span className="mrow__move">
            <button
              type="button"
              className="mrow__btn mrow__btn--move"
              onClick={onMoveUp || undefined}
              disabled={!onMoveUp}
              aria-label={t('menu_reorder_move_up')}
              title={t('menu_reorder_move_up')}
            >
              <Icon name="chevronUp" size={14} />
            </button>
            <button
              type="button"
              className="mrow__btn mrow__btn--move"
              onClick={onMoveDown || undefined}
              disabled={!onMoveDown}
              aria-label={t('menu_reorder_move_down')}
              title={t('menu_reorder_move_down')}
            >
              <Icon name="chevronDown" size={14} />
            </button>
          </span>
        ) : null}
        <button
          type="button"
          className="mrow__btn"
          onClick={() => onEdit(category)}
          disabled={!canManage}
          aria-label={`${t('action_edit')} — ${name}`}
          title={t('action_edit')}
        >
          <Icon name="pencil" size={15} />
        </button>
        <button
          type="button"
          className="mrow__btn mrow__btn--danger"
          onClick={() => onDelete(category)}
          disabled={!canManage}
          aria-label={`${t('action_delete')} — ${name}`}
          title={t('action_delete')}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </li>
  );
}
