import { useState } from 'react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProductCard from './ProductCard';
import ProductMedia from '../product/ProductMedia';
import { localized, useI18n } from '../../i18n';
import { moveId, useReorderSensors } from './reorder';

/*
 * The product grid in Display Order mode.
 *
 * Every card is a sortable item, but only its grip is an activator — the Edit
 * and Delete buttons, the card body and the image stay ordinary controls and a
 * drag can never start from them. The sequence that comes out of a drop is the
 * category's complete product list, which is exactly what the reorder endpoint
 * expects, so a hidden or filtered card can never be dropped from the save.
 */
function SortableProductCard({ product, index, ids, onReorder, dropTarget, ...cardProps }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const moveTo = (to) => {
    const next = ids.slice();
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <div
      ref={setNodeRef}
      className={`msort ${isDragging ? 'is-dragging' : ''}`.trim()}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <ProductCard
        {...cardProps}
        product={product}
        dropTarget={dropTarget}
        dragHandle={{ ref: setActivatorNodeRef, attributes, listeners }}
        onMoveUp={index > 0 ? () => moveTo(index - 1) : null}
        onMoveDown={index < ids.length - 1 ? () => moveTo(index + 1) : null}
      />
    </div>
  );
}

export default function SortableProductGrid({ products, onReorder, renderCard }) {
  const { t, locale } = useI18n();
  const sensors = useReorderSensors();
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const ids = products.map((p) => p.id);
  const active = products.find((p) => p.id === activeId) || null;

  const end = ({ active: dragged, over }) => {
    setActiveId(null);
    setOverId(null);
    if (!over) return;
    const next = moveId(ids, dragged.id, over.id);
    if (next) onReorder(next);
  };

  return (
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
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="mgrid">
          {products.map((product, index) => (
            <SortableProductCard
              key={product.id}
              product={product}
              index={index}
              ids={ids}
              onReorder={onReorder}
              dropTarget={Boolean(overId) && overId === product.id && overId !== activeId}
              {...renderCard(product)}
            />
          ))}
        </div>
      </SortableContext>

      {/* The lifted card: the same product, raised out of the grid. */}
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className={`mcard mcard--ghost ${!active.active || active.category_active === false ? 'mcard--muted' : ''}`.trim()}>
            <div className="mcard__media">
              {/* The lifted card shows exactly what the resting card shows. */}
              <ProductMedia
                product={active}
                category={renderCard(active).category}
                variant="admin-card"
                muted={!active.active || active.category_active === false}
              />
            </div>
            <div className="mcard__ghost-name">{localized(active, 'name', locale) || t('label_translation_missing')}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
