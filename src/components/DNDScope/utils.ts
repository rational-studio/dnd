import type { Coord, Rect } from '../../store';

export function calculateCurrentDraggableRect(
  initialRect: Rect,
  mouseDelta: Coord,
  action: 'move' | 'resize-start' | 'resize-end' | 'create',
  axis: 'x' | 'y' | 'xy'
) {
  switch (action) {
    case 'move':
      return {
        ...initialRect,
        x: initialRect.x + mouseDelta.x,
        y: initialRect.y + mouseDelta.y,
      };
    case 'resize-start': {
      if (axis === 'y') {
        const initialBottomY = initialRect.y + initialRect.h;
        const newY = initialRect.y + mouseDelta.y;
        if (newY <= initialBottomY) {
          return {
            ...initialRect,
            y: newY,
            h: initialRect.h - mouseDelta.y,
          };
        } else {
          return {
            ...initialRect,
            y: initialBottomY,
            h: mouseDelta.y - initialRect.h,
          };
        }
      } else if (axis === 'x') {
        const initialRightX = initialRect.x + initialRect.w;
        const newX = initialRect.x + mouseDelta.x;
        if (newX <= initialRightX) {
          return {
            ...initialRect,
            x: newX,
            w: initialRect.w - mouseDelta.x,
          };
        } else {
          return {
            ...initialRect,
            x: initialRightX,
            w: mouseDelta.x - initialRect.w,
          };
        }
      } else {
        throw new Error('resize-start action only supports x or y axis');
      }
    }
    case 'resize-end': {
      if (axis === 'y') {
        const newHeight = initialRect.h + mouseDelta.y;
        if (newHeight >= 0) {
          return {
            ...initialRect,
            h: newHeight,
          };
        } else {
          return {
            ...initialRect,
            y: initialRect.y + initialRect.h + mouseDelta.y,
            h: -mouseDelta.y - initialRect.h,
          };
        }
      } else if (axis === 'x') {
        const newWidth = initialRect.w + mouseDelta.x;
        if (newWidth >= 0) {
          return {
            ...initialRect,
            w: newWidth,
          };
        } else {
          return {
            ...initialRect,
            x: initialRect.x + initialRect.w + mouseDelta.x,
            w: -mouseDelta.x - initialRect.w,
          };
        }
      } else {
        throw new Error('resize-end action only supports x or y axis');
      }
    }
    case 'create': {
      const newRect = { ...initialRect };
      if (mouseDelta.y > 0) {
        newRect.h = mouseDelta.y;
      } else if (mouseDelta.y < 0) {
        newRect.y = initialRect.y + mouseDelta.y;
        newRect.h = -mouseDelta.y;
      }
      if (mouseDelta.x > 0) {
        newRect.w = mouseDelta.x;
      } else if (mouseDelta.x < 0) {
        newRect.x = initialRect.x + mouseDelta.x;
        newRect.w = -mouseDelta.x;
      }
      return newRect;
    }
    default:
      return initialRect;
  }
}
