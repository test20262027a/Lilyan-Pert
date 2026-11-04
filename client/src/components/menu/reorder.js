import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/*
 * Drag behaviour shared by the two sortable admin lists (categories, and the
 * products inside one category).
 *
 * A mouse has to travel a few pixels before a drag begins, so a plain click on
 * the handle still does nothing odd; a finger has to rest briefly on the handle,
 * so scrolling the list never turns into an accidental reorder. The handle is
 * the only place touch-action is disabled (see menu.css), which keeps normal
 * vertical scrolling everywhere else.
 */
export function useReorderSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/**
 * The full id sequence with `activeId` placed where `overId` currently is.
 * Returns null when either id is unknown or nothing would move, so callers can
 * skip a pointless save.
 */
export function moveId(ids, activeId, overId) {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return null;
  const next = ids.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
