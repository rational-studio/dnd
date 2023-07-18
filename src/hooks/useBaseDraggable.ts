import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { distanceBetween } from '../collisionDetection/algorithms';
import { useInternalDNDScope } from '../components/DNDScope';
import {
  type Coord,
  type DataPayload,
  type DraggableItem,
  type Rect,
} from '../store';
import type { CommonDraggableOptions } from './typings';
import { getDroppableCollisionUpdate } from './utils';

interface BaseDraggableOptions<DraggablePayload extends DataPayload>
  extends CommonDraggableOptions<DraggablePayload> {
  resizeElementBoundingClientRect: () => Rect | undefined;
  boundingClientRect: () => Rect;
}

export function useBaseDraggable<DraggablePayload extends DataPayload>(
  options: BaseDraggableOptions<DraggablePayload>,
  cleanupFn: () => void
) {
  const _identity = useId();
  const {
    payload: { type, data },
    resizeElementBoundingClientRect,
    boundingClientRect,
    animated = false,
    cursor = 'default',
    action = 'move',
    axis = 'xy',
  } = options;

  const {
    store,
    distanceConstraint,
    collisionDetectionRef,
    onDragStartRef,
    onDragCancelRef,
  } = useInternalDNDScope();

  const [isActiveDraggable, setIsActiveDraggable] = useState(
    () => store.getState().activeDraggable?._identity === _identity
  );

  // TODO: Strip for production-build
  if ((action === 'resize-start' || action === 'resize-end') && axis === 'xy') {
    throw new Error(
      `Axis 'xy' is not supported for resize actions. Use 'x' or 'y' instead.`
    );
  }

  useEffect(
    () =>
      store.subscribe(
        state => state.activeDraggable,
        activeDraggable => {
          if (activeDraggable && activeDraggable._identity === _identity) {
            setIsActiveDraggable(true);
          } else {
            setIsActiveDraggable(false);
          }
        }
      ),
    [_identity, store]
  );

  const initialMouseCoord = useRef<Coord>({ x: 0, y: 0 });

  const setInitialMouseCoord = useCallback((mouseCoord: Coord) => {
    initialMouseCoord.current = mouseCoord;
  }, []);

  const startDragging = useCallback(
    (mouseCoord: Coord) => {
      const distance = distanceBetween(initialMouseCoord.current, mouseCoord);

      if (distance < distanceConstraint) {
        return;
      }

      const resizeElementRect = resizeElementBoundingClientRect();
      const draggableRect =
        (action === 'resize-end' || action === 'resize-start') &&
        resizeElementRect
          ? resizeElementRect
          : boundingClientRect();

      if (action === 'create') {
        draggableRect.x =
          axis === 'x' || axis === 'xy' ? mouseCoord.x : draggableRect.x;
        draggableRect.y =
          axis === 'y' || axis === 'xy' ? mouseCoord.y : draggableRect.y;
      }

      const draggable = {
        _identity,
        payload: { type, data },
        action,
        animated,
        cursor,
        axis,
        cleanupFn,
      } satisfies DraggableItem;

      store.setState(state => {
        // Drag is starting, take a snapshot of Rect of all Droppables
        const droppableRects = state.droppables.map(item =>
          item.boundingClientRect()
        );
        const droppableUpdater = getDroppableCollisionUpdate(
          type,
          state.droppables,
          draggableRect,
          mouseCoord,
          collisionDetectionRef.current
        );
        return {
          activeDraggable: draggable,
          lastKnownActiveDraggabble: draggable,
          initialDraggableRect: draggableRect,
          currentDraggableRect: draggableRect,
          currentTransformedGhostRect: draggableRect,
          initialMouseCoord: mouseCoord,
          currentMouseCoord: mouseCoord,
          droppableRects,
          ...droppableUpdater,
        };
      });

      // FIXME: This is not onDragStart, it will be called
      // whenever the pointermove is happening
      onDragStartRef.current?.(draggable, draggableRect);
    },
    [
      _identity,
      action,
      animated,
      axis,
      boundingClientRect,
      cleanupFn,
      collisionDetectionRef,
      cursor,
      data,
      distanceConstraint,
      onDragStartRef,
      resizeElementBoundingClientRect,
      store,
      type,
    ]
  );

  const endDraggingPrematurely = useCallback(() => {
    store.setState(state => {
      const { activeDraggable } = state;
      if (activeDraggable && activeDraggable._identity === _identity) {
        onDragCancelRef.current?.(activeDraggable);
        activeDraggable.cleanupFn();
        return {
          ...state,
          activeDraggable: null,
          activeDroppable: null,
        };
      }
      return state;
    });
  }, [_identity, onDragCancelRef, store]);

  return {
    setInitialMouseCoord,
    startDragging,
    endDraggingPrematurely,
    isActiveDraggable,
  };
}
