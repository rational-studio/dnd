import type {
  CollisionDetectionAlgorithm,
  Coord,
  DroppableItem,
  Rect,
} from '../store';

export function preventDefault(event: Event) {
  event.preventDefault();
}

export function stopPropagation(event: Event) {
  event.stopPropagation();
}

export function removeTextSelection() {
  document.getSelection()?.removeAllRanges();
}

export function getDroppableCollisionUpdate(
  type: string,
  droppables: DroppableItem[],
  currentDraggableRect: Rect,
  currentMouseCoord: Coord,
  collisionDetection: CollisionDetectionAlgorithm
) {
  const droppableUpdater: {
    activeDroppable: DroppableItem | null;
    collisions: DroppableItem[];
  } = {
    activeDroppable: null,
    collisions: [],
  };

  const collisions = collisionDetection(
    droppables.filter(item => item.accepts.includes(type)),
    currentDraggableRect,
    currentMouseCoord
  );

  droppableUpdater.collisions = collisions;
  droppableUpdater.activeDroppable =
    collisions.length > 0 ? collisions[0] : null;

  return droppableUpdater;
}

export function clientDOMRectToRect(clientRect: DOMRect): Rect {
  return {
    x: clientRect.left,
    y: clientRect.top,
    w: clientRect.width,
    h: clientRect.height,
  };
}
