import { useCallback, useEffect, useState, type MutableRefObject } from 'react';

import { type DataPayload } from '../store';
import type { CommonDraggableOptions } from './typings';
import { useBaseDraggable } from './useBaseDraggable';
import { clientDOMRectToRect } from './utils';

interface DraggableOptions<DraggablePayload extends DataPayload>
  extends CommonDraggableOptions<DraggablePayload> {
  resizeElementRef?: MutableRefObject<HTMLElement | null>;
}

export function useDraggable<DraggablePayload extends DataPayload>({
  resizeElementRef,
  ...options
}: DraggableOptions<DraggablePayload>) {
  const [preActivationPhase, setPreActivationPhase] = useState(false);
  const cleanupFn = useCallback(() => setPreActivationPhase(false), []);
  const [draggableElement, setDraggableRef] = useState<HTMLElement | null>(
    null
  );

  const resizeElementBoundingClientRect = useCallback(() => {
    if (!resizeElementRef || !resizeElementRef.current) {
      return;
    }
    return clientDOMRectToRect(
      resizeElementRef.current.getBoundingClientRect()
    );
  }, [resizeElementRef]);

  const boundingClientRect = useCallback(() => {
    if (!draggableElement) {
      return {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
      };
    }
    return clientDOMRectToRect(draggableElement.getBoundingClientRect());
  }, [draggableElement]);

  const { isActiveDraggable, setInitialMouseCoord, startDragging } =
    useBaseDraggable(
      { ...options, resizeElementBoundingClientRect, boundingClientRect },
      cleanupFn
    );

  useEffect(() => {
    if (!draggableElement || preActivationPhase) {
      return;
    }
    function enterPreActivationPhase(event: PointerEvent) {
      if (!event.isPrimary) {
        return;
      }
      setInitialMouseCoord({
        x: event.clientX,
        y: event.clientY,
      });
      setPreActivationPhase(true);
    }
    draggableElement.addEventListener('pointerdown', enterPreActivationPhase);
    return () => {
      draggableElement.removeEventListener(
        'pointerdown',
        enterPreActivationPhase
      );
    };
  }, [draggableElement, preActivationPhase, setInitialMouseCoord]);

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
      startDragging({ x: event.clientX, y: event.clientY });
    }

    window.addEventListener('pointermove', handleStart);
    window.addEventListener('pointerup', exitPreActivationPhase);
    return () => {
      window.removeEventListener('pointermove', handleStart);
      window.removeEventListener('pointerup', exitPreActivationPhase);
    };
  }, [draggableElement, isActiveDraggable, preActivationPhase, startDragging]);

  return {
    ref: setDraggableRef,
    isDragging: isActiveDraggable,
    node: draggableElement,
  };
}
