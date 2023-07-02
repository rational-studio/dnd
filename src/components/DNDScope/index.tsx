import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { rectangleIntersection } from '../../collisionDetection';
import {
  getDroppableCollisionUpdate,
  preventDefault,
  removeTextSelection,
  stopPropagation,
} from '../../hooks/utils';
import {
  followDraggableItem,
  type PositionTransformer,
} from '../../positionTransform';
import {
  dndState,
  type CollisionDetectionAlgorithm,
  type Coord,
  type DraggableItem,
  type DroppableItem,
  type Rect,
} from '../../store';
import { calculateCurrentDraggableRect } from './utils';

function delta(a: Coord, b: Coord): Coord {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

interface DNDScopeProps {
  children: ReactNode;
  distanceConstraint?: number;
  dragOverlayPosition?: PositionTransformer;
  positionOverlayPosition?: PositionTransformer;
  collisionDetection?: CollisionDetectionAlgorithm;
  onDragStart?: (
    activeDraggable: DraggableItem,
    currentDraggableRect: Rect
  ) => void;
  onDragOver?: (
    activeDraggable: DraggableItem,
    activeDroppable: DroppableItem | null,
    currentDraggableRect: Rect
  ) => void;
  onDragEnd?: (
    activeDraggable: DraggableItem,
    activeDroppable: DroppableItem | null,
    currentDraggableRect: Rect
  ) => void;
  onDragCancel?: (activeDraggable: DraggableItem) => void;
}

function createDNDStore() {
  return createStore(subscribeWithSelector(dndState));
}

const defaultGlobalStore = createDNDStore();

interface DNDScopeContext {
  store: typeof defaultGlobalStore;
  distanceConstraint: number;
  collisionDetectionRef: MutableRefObject<CollisionDetectionAlgorithm>;
  onDragStartRef: MutableRefObject<
    | ((activeDraggable: DraggableItem, currentDraggableRect: Rect) => void)
    | undefined
  >;
}

const InternalContext = createContext<DNDScopeContext>({
  store: defaultGlobalStore,
  distanceConstraint: 0,
  collisionDetectionRef: { current: rectangleIntersection },
  onDragStartRef: { current: undefined },
});

const DNDScope: FC<DNDScopeProps> = ({
  children,
  dragOverlayPosition = followDraggableItem,
  positionOverlayPosition = dragOverlayPosition,
  collisionDetection = rectangleIntersection,
  distanceConstraint = 10,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
}) => {
  const [store] = useState(createDNDStore);

  const collisionDetectionRef = useRef(collisionDetection);
  const onDragStartRef = useRef(onDragStart);
  const onDragOverRef = useRef(onDragOver);
  const onDragEndRef = useRef(onDragEnd);
  const onDragCancelRef = useRef(onDragCancel);

  collisionDetectionRef.current = collisionDetection;
  onDragStartRef.current = onDragStart;
  onDragOverRef.current = onDragOver;
  onDragEndRef.current = onDragEnd;
  onDragCancelRef.current = onDragCancel;

  const [activeDraggable, setActiveDraggable] = useState<DraggableItem | null>(
    null
  );

  useEffect(() => {
    return store.subscribe(
      store => store.activeDraggable,
      activeDraggable => {
        setActiveDraggable(activeDraggable);
      }
    );
  }, [store]);

  // This hook handles the DnD movement phase
  // The DnD activation is done, and this will block
  // all other mouse events
  useEffect(() => {
    if (!activeDraggable) {
      return;
    }

    function handleCancel() {
      if (activeDraggable) {
        onDragCancelRef.current?.(activeDraggable);
        activeDraggable.cleanupFn();
      }
      store.setState({
        activeDraggable: null,
        activeDroppable: null,
      });
    }

    function handleMove(this: Window, event: PointerEvent) {
      if (!activeDraggable) {
        return;
      }

      // TODO: To support iPad, we might need to preventDefault here

      const {
        axis,
        action,
        payload: { type: payloadType },
      } = activeDraggable;

      store.setState(state => {
        const {
          droppables,
          activeDroppable,
          initialDraggableRect,
          initialMouseCoord,
        } = state;

        const currentMouseCoord = {
          x:
            axis === 'x' || axis === 'xy' ? event.clientX : initialMouseCoord.x,
          y:
            axis === 'y' || axis === 'xy' ? event.clientY : initialMouseCoord.y,
        };
        const mouseDelta = delta(currentMouseCoord, initialMouseCoord);

        const currentDraggableRect = calculateCurrentDraggableRect(
          initialDraggableRect,
          mouseDelta,
          action,
          axis
        );

        const currentTransformedGhostRect = dragOverlayPosition(
          activeDraggable,
          activeDroppable,
          currentDraggableRect,
          currentMouseCoord
        );

        const currentTransformedPositionRect =
          positionOverlayPosition !== dragOverlayPosition
            ? positionOverlayPosition(
                activeDraggable,
                activeDroppable,
                currentDraggableRect,
                currentMouseCoord
              )
            : currentTransformedGhostRect;

        // Check if any droppable is active
        const droppableStateUpdate = getDroppableCollisionUpdate(
          payloadType,
          droppables,
          currentDraggableRect,
          currentMouseCoord,
          collisionDetectionRef.current
        );
        if (
          activeDroppable?._identity !==
          droppableStateUpdate.activeDroppable?._identity
        ) {
          onDragOverRef.current?.(
            activeDraggable,
            droppableStateUpdate.activeDroppable,
            currentDraggableRect
          );
        }
        return {
          currentMouseCoord,
          currentDraggableRect,
          currentTransformedGhostRect,
          currentTransformedPositionRect,
          ...droppableStateUpdate,
        };
      });
    }

    function handleEnd(this: Window, event: PointerEvent) {
      handleMove.call(this, event);
      // Call `didDrop` if the draggable is dropped on a droppable
      const {
        activeDraggable,
        activeDroppable,
        currentTransformedPositionRect,
        currentMouseCoord,
      } = store.getState();

      if (
        activeDraggable &&
        activeDroppable &&
        currentTransformedPositionRect
      ) {
        activeDroppable.onDropRef.current?.(
          activeDraggable,
          currentTransformedPositionRect,
          currentMouseCoord
        );
        onDragEndRef.current?.(
          activeDraggable,
          activeDroppable,
          currentTransformedPositionRect
        );
        activeDraggable.cleanupFn();
      } else if (activeDraggable) {
        onDragCancelRef.current?.(activeDraggable);
        activeDraggable.cleanupFn();
      }

      // Clear the active draggable, and all rects
      store.setState(state => ({
        ...state,
        activeDraggable: null,
        activeDroppable: null,
      }));
    }
    document.addEventListener('selectionchange', removeTextSelection);
    document.addEventListener('click', stopPropagation, { capture: true });
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('resize', handleCancel);
    window.addEventListener('dragstart', preventDefault);
    window.addEventListener('visibilitychange', handleCancel);
    window.addEventListener('contextmenu', preventDefault);
    return () => {
      document.removeEventListener('selectionchange', removeTextSelection);
      document.removeEventListener('click', stopPropagation, { capture: true });
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('resize', handleCancel);
      window.removeEventListener('dragstart', preventDefault);
      window.removeEventListener('visibilitychange', handleCancel);
      window.removeEventListener('contextmenu', preventDefault);
    };
  }, [activeDraggable, dragOverlayPosition, positionOverlayPosition, store]);

  return (
    <InternalContext.Provider
      value={{
        store,
        distanceConstraint,
        collisionDetectionRef,
        onDragStartRef,
      }}
    >
      {children}
    </InternalContext.Provider>
  );
};

/**
 * @internal
 */
export function useInternalDNDScope() {
  return useContext(InternalContext);
}

/**
 * Currently it exposes all the internal state of the DND scope.
 * Later we might want to expose only the necessary state.
 */
export function useDNDScope() {
  return useInternalDNDScope().store;
}

export default DNDScope;
