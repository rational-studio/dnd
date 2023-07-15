import { type CSSProperties } from 'react';

export interface DataPayload {
  type: string;
  data: unknown;
}

export interface DraggableItem<Payload extends DataPayload = DataPayload> {
  _identity: string;
  axis: 'x' | 'y' | 'xy';
  cursor: CSSProperties['cursor'];
  action: 'move' | 'resize-start' | 'resize-end' | 'create';
  animated: boolean;
  payload: Payload;
  cleanupFn: () => void;
}

export type Rect = { x: number; y: number; w: number; h: number };
export type Coord = { x: number; y: number };

export type CollisionDetectionAlgorithm = (
  droppableItems: DroppableItem[],
  draggableRect: Rect,
  mouseCoord: Coord
) => DroppableItem[];

export interface DroppableItem<
  DroppablePayload extends DataPayload = DataPayload,
  DraggablePayload extends DataPayload = DataPayload,
> {
  _identity: string;
  payload: DroppablePayload;
  boundingClientRect: () => Rect;
  accepts: readonly DraggablePayload['type'][];
  onDropRef: React.MutableRefObject<
    | ((
        activeDraggable: DraggableItem<DraggablePayload>,
        currentTransformedDraggableRect: Rect,
        currentMouseCoord: Coord
      ) => void)
    | undefined
  >;
}

/**
 * @internal
 */
export interface DNDState<
  DraggablePayload extends DataPayload,
  DroppablePayload extends DataPayload,
> {
  activeDraggable: null | DraggableItem<DraggablePayload>;
  lastKnownActiveDraggabble: null | DraggableItem<DraggablePayload>;
  activeDroppable: null | DroppableItem<DraggablePayload, DroppablePayload>;
  initialDraggableRect: Rect;
  currentDraggableRect: Rect;
  currentTransformedGhostRect: Rect | null; // null if intentionally hidden
  currentTransformedPositionRect: Rect | null; // used for debugging
  initialMouseCoord: Coord;
  currentMouseCoord: Coord;
  droppables: DroppableItem<DraggablePayload, DroppablePayload>[];
  collisions: DroppableItem<DraggablePayload, DroppablePayload>[];
  droppableRects: Rect[];
}

export const initialRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
export const initialCoord: Coord = { x: 0, y: 0 };

const initialState = {
  activeDraggable: null,
  lastKnownActiveDraggabble: null,
  activeDroppable: null,
  initialDraggableRect: initialRect,
  currentDraggableRect: initialRect,
  currentTransformedGhostRect: initialRect,
  currentTransformedPositionRect: initialRect,
  initialMouseCoord: initialCoord,
  currentMouseCoord: initialCoord,
  droppables: [],
  collisions: [],
  droppableRects: [],
} satisfies DNDState<DataPayload, DataPayload>;

/**
 * @internal
 */
export function dndState<
  DraggablePayload extends DataPayload,
  DroppablePayload extends DataPayload,
>(): DNDState<DraggablePayload, DroppablePayload> {
  return initialState;
}
