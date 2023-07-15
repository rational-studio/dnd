import { useEffect, useId, useRef, useState } from 'react';

import { useInternalDNDScope } from '../components/DNDScope';
import type { DataPayload, DraggableItem, Rect } from '../store';
import { clientDOMRectToRect } from './utils';

type DroppableOptions<
  DroppablePayload extends DataPayload,
  DraggablePayload extends DataPayload,
  AcceptedDraggableTypes extends readonly string[],
> = {
  accepts: AcceptedDraggableTypes;
  payload: DroppablePayload;
  onDrop?: (
    activeDraggable: DraggableItem<DraggablePayload>,
    currentTransformedDraggableRect: Rect
  ) => void;
};

export function useDroppable<
  DroppablePayload extends DataPayload,
  DraggablePayload extends DataPayload,
  AcceptedDraggableTypes extends readonly string[],
>(
  options: DroppableOptions<
    DroppablePayload,
    DraggablePayload,
    AcceptedDraggableTypes
  >
) {
  const {
    accepts,
    payload: { type, data },
    onDrop,
  } = options;

  const _identity = useId();
  const { store } = useInternalDNDScope();

  const [element, setElementRef] = useState<HTMLElement | null>(null);
  const [isActiveDroppable, setIsActiveDroppable] = useState(false);

  const acceptsRef = useRef(accepts);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  // Check if this is the active droppable
  useEffect(() => {
    return store.subscribe(
      state => state.activeDroppable,
      activeDroppable =>
        setIsActiveDroppable(
          activeDroppable !== null && activeDroppable._identity === _identity
        )
    );
  }, [_identity, store]);

  // Register or unregister the droppable
  useEffect(() => {
    if (!element) {
      return;
    }

    // @ts-expect-error
    store.setState(state => {
      const { droppables } = state;
      return {
        droppables: [
          ...droppables,
          {
            _identity,
            accepts: acceptsRef.current,
            payload: {
              type,
              data,
            },
            onDropRef,
            boundingClientRect: () =>
              clientDOMRectToRect(element.getBoundingClientRect()),
          },
        ],
      };
    });
    return () => {
      store.setState(state => ({
        droppables: state.droppables.filter(d => d._identity !== _identity),
      }));
    };
  }, [_identity, data, element, store, type]);

  return {
    ref: setElementRef,
    isHovering: isActiveDroppable,
    node: element,
  };
}
