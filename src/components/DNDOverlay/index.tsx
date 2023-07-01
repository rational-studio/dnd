import { useEffect, useState, type ReactNode } from 'react';
import Portal from '@rational/portal';

import type { DraggableItem, Rect } from '../../store';
import { useInternalDNDScope } from '../DNDScope';

const defaultAbsoluteOffset = { x: 0, y: 0 };

function positionOverlayByDraggable(
  overlayElement: HTMLDivElement,
  draggable: DraggableItem | null,
  currentRect: Rect,
  disableAnimation: boolean,
  animationObj: {
    initialW?: number;
    initialH?: number;
    animationOngoing: boolean;
  },
  absoluteOffset = defaultAbsoluteOffset
) {
  const { x: originalX, y: originalY, w, h } = currentRect;
  const { x: offsetX, y: offsetY } = absoluteOffset;
  const x = originalX - offsetX;
  const y = originalY - offsetY;
  if (draggable) {
    overlayElement.style.display = 'block';
    overlayElement.style.cursor = draggable.cursor ?? '';
    if (draggable.animated && !disableAnimation) {
      if (
        (animationObj.initialW !== w || animationObj.initialH !== h) &&
        animationObj.initialW !== undefined &&
        animationObj.initialH !== undefined
      ) {
        if (animationObj.animationOngoing) {
          overlayElement.style.translate = `${x}px ${y}px`;
          return;
        }
        animationObj.animationOngoing = true;
        overlayElement.style.width = `${w}px`;
        overlayElement.style.height = `${h}px`;
        overlayElement.style.translate = `${x}px ${y}px`;
        const animation = overlayElement.animate(
          [
            {
              scale: `${animationObj.initialW / w} ${
                animationObj.initialH / h
              }`,
            },
            {
              scale: `1`,
            },
          ],
          {
            duration: 200,
            easing: 'ease-out',
          }
        );
        animation.addEventListener(
          'finish',
          () => {
            animationObj.initialW = w;
            animationObj.initialH = h;
            animationObj.animationOngoing = false;
          },
          { once: true }
        );
      } else {
        overlayElement.style.width = `${w}px`;
        overlayElement.style.height = `${h}px`;
        overlayElement.style.translate = `${x}px ${y}px`;
        animationObj.initialW = w;
        animationObj.initialH = h;
      }
    } else {
      overlayElement.style.width = `${w}px`;
      overlayElement.style.height = `${h}px`;
      overlayElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  } else {
    // Reset all transform properties
    overlayElement.style.display = 'none';
    overlayElement.style.cursor = '';
    overlayElement.style.transform = '';
    overlayElement.style.translate = '';
    overlayElement.style.scale = '';
  }
}

const DNDOverlay: React.FC<{
  zIndex?: number;
  dragOverlay: ReactNode;
  positionOverlay?: ReactNode;
  positionOverlayTarget?: HTMLElement | null;
}> = ({ dragOverlay, positionOverlay, positionOverlayTarget, zIndex = 50 }) => {
  const [draggableOverlayElement, setDraggableOverlayElement] =
    useState<HTMLDivElement | null>(null);
  const [positionOverlayElement, setPositionOverlayElement] =
    useState<HTMLDivElement | null>(null);

  const { store } = useInternalDNDScope();

  useEffect(() => {
    if (!draggableOverlayElement) {
      return;
    }

    // For Animated Draggables
    const animationObj: {
      initialW?: number;
      initialH?: number;
      animationOngoing: boolean;
    } = {
      animationOngoing: false,
    };

    return store.subscribe(
      state => ({
        activeDraggable: state.activeDraggable,
        currentTransformedRect: state.currentTransformedGhostRect,
      }),
      ({ activeDraggable, currentTransformedRect }) => {
        // intentionally hide the overlay if transformed rect is null
        if (!currentTransformedRect) {
          draggableOverlayElement.style.display = 'none';
          return;
        }
        positionOverlayByDraggable(
          draggableOverlayElement,
          activeDraggable,
          currentTransformedRect,
          false,
          animationObj
        );
      }
    );
  }, [draggableOverlayElement, store]);

  useEffect(() => {
    if (!positionOverlayElement) {
      return;
    }

    // For Animated Draggables, but for position overlay
    // we disable it
    const animationObj: {
      initialW?: number;
      initialH?: number;
      animationOngoing: boolean;
    } = {
      animationOngoing: false,
    };

    return store.subscribe(
      state => ({
        activeDraggable: state.activeDraggable,
        currentTransformedRect: state.currentTransformedPositionRect,
      }),
      ({ activeDraggable, currentTransformedRect }) => {
        // intentionally hide the overlay if transformed rect is null
        if (!currentTransformedRect) {
          positionOverlayElement.style.display = 'none';
          return;
        }

        let absoluteOffset: { x: number; y: number } | undefined;

        if (positionOverlayTarget) {
          const { x, y } = positionOverlayTarget.getBoundingClientRect();
          const scrollX = positionOverlayTarget.scrollLeft;
          const scrollY = positionOverlayTarget.scrollTop;
          absoluteOffset = { x: x - scrollX, y: y - scrollY };
        }

        positionOverlayByDraggable(
          positionOverlayElement,
          activeDraggable,
          currentTransformedRect,
          true,
          animationObj,
          absoluteOffset
        );
      }
    );
  }, [positionOverlayElement, positionOverlayTarget, store]);

  return (
    <>
      {positionOverlay ? (
        <Portal target={positionOverlayTarget}>
          <div
            style={{
              left: 0,
              top: 0,
              zIndex,
              willChange: 'transform',
              display: 'none',
              position: positionOverlayTarget ? 'absolute' : 'fixed',
            }}
            ref={setPositionOverlayElement}
          >
            {positionOverlay}
          </div>
        </Portal>
      ) : null}
      <Portal>
        <div
          className="fixed left-0 top-0 z-50 will-change-transform"
          style={{
            display: 'none',
          }}
          ref={setDraggableOverlayElement}
        >
          {dragOverlay}
        </div>
      </Portal>
    </>
  );
};

export default DNDOverlay;
