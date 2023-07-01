import type { Coord, DraggableItem, DroppableItem, Rect } from './store';

export type PositionTransformer = (
  activeDraggable: DraggableItem<any> | null,
  activeDroppable: DroppableItem<any, any> | null,
  currentDraggableRect: Rect,
  currentMouseCoord: Coord
) => Rect | null;

export const followDraggableItem: PositionTransformer = (
  _,
  __,
  currentDraggableRect
) => currentDraggableRect;
