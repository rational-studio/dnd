import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from 'react';

import { distanceBetween } from '../collisionDetection/algorithms';
import { useInternalDNDScope } from '../components/DNDScope';
import { type Coord, type DataPayload, type DraggableItem } from '../store';
import { clientDOMRectToRect, getDroppableCollisionUpdate } from './utils';

type DraggableOptions<DraggablePayload extends DataPayload> = {
  payload: DraggablePayload;
  resizeElementRef?: MutableRefObject<HTMLElement | null>;
  cursor?: CSSProperties['cursor'];
  action?: 'move' | 'resize-start' | 'resize-end' | 'create';
  animated?: boolean;
  axis?: 'x' | 'y' | 'xy';
  onMove?: (delta: Coord, event: PointerEvent) => void;
  positionOverlay?: DraggablePayload['type'];
};

export function useDraggable<DraggablePayload extends DataPayload>(
  options: DraggableOptions<DraggablePayload>
) {
  const _identity = useId();
  const {
    payload: { type, data },
    resizeElementRef,
    animated = false,
    cursor = 'default',
    action = 'move',
    axis = 'xy',
    positionOverlay,
  } = options;
  const { store, distanceConstraint, collisionDetectionRef, onDragStartRef } =
    useInternalDNDScope();
  const [isActiveDraggable, setIsActiveDraggable] = useState(
    () => store.getState().activeDraggable?._identity === _identity
  );
  const [draggableElement, setDraggableRef] = useState<HTMLElement | null>(
    null
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

  const [preActivationPhase, setPreActivationPhase] = useState(false);
  const initialMouseCoord = useRef<Coord>({ x: 0, y: 0 });

  useEffect(() => {
    if (!draggableElement || preActivationPhase) {
      return;
    }
    function enterPreActivationPhase(event: PointerEvent) {
      if (!event.isPrimary) {
        return;
      }
      initialMouseCoord.current = {
        x: event.clientX,
        y: event.clientY,
      };
      setPreActivationPhase(true);
    }
    draggableElement.addEventListener('pointerdown', enterPreActivationPhase);
    return () => {
      draggableElement.removeEventListener(
        'pointerdown',
        enterPreActivationPhase
      );
    };
  }, [draggableElement, preActivationPhase]);

  // This hook checks the constraints of the pre-activation phase
  useEffect(() => {
    if (!draggableElement || !preActivationPhase || isActiveDraggable) {
      return;
    }

    function exitPreActivationPhase(event: PointerEvent) {
      if (!event.isPrimary) {
        return;
      }
      setPreActivationPhase(false);
    }

    function handleStart(this: Window, event: PointerEvent) {
      if (!event.isPrimary || !draggableElement) {
        return;
      }

      const { x: initialX, y: initialY } = initialMouseCoord.current;
      const { clientX, clientY } = event;

      const distance = distanceBetween(
        { x: initialX, y: initialY },
        { x: clientX, y: clientY }
      );

      if (distance < distanceConstraint) {
        return;
      }

      const elementRect =
        (action === 'resize-end' || action === 'resize-start') &&
        resizeElementRef?.current
          ? resizeElementRef.current.getBoundingClientRect()
          : draggableElement.getBoundingClientRect();

      const draggableRect = clientDOMRectToRect(elementRect);

      if (action === 'create') {
        draggableRect.x =
          axis === 'x' || axis === 'xy' ? clientX : draggableRect.x;
        draggableRect.y =
          axis === 'y' || axis === 'xy' ? clientY : draggableRect.y;
      }

      const mouseCoord = { x: clientX, y: clientY };

      const draggable = {
        _identity,
        payload: { type, data },
        node: draggableElement,
        action,
        animated,
        cursor,
        axis,
        cleanupFn: () => setPreActivationPhase(false),
      } satisfies DraggableItem;

      store.setState(state => {
        // Drag is starting, take a snapshot of Rect of all Droppables
        const droppableRects = state.droppables.map(item =>
          clientDOMRectToRect(item.node.getBoundingClientRect())
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
    }
    window.addEventListener('pointermove', handleStart);
    window.addEventListener('pointerup', exitPreActivationPhase);
    return () => {
      window.removeEventListener('pointermove', handleStart);
      window.removeEventListener('pointerup', exitPreActivationPhase);
    };
  }, [
    _identity,
    action,
    animated,
    axis,
    collisionDetectionRef,
    cursor,
    data,
    distanceConstraint,
    draggableElement,
    isActiveDraggable,
    onDragStartRef,
    positionOverlay,
    preActivationPhase,
    resizeElementRef,
    store,
    type,
  ]);

  return {
    ref: setDraggableRef,
    isDragging: isActiveDraggable,
    node: draggableElement,
  };
}
