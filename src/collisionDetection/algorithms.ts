import type { Coord, Rect } from '../store';

export function rectangleIntersection(
  droppableRect: Rect,
  draggableRect: Rect
) {
  const top = Math.max(droppableRect.y, draggableRect.y);
  const left = Math.max(droppableRect.x, draggableRect.x);
  const right = Math.min(
    droppableRect.x + droppableRect.w,
    draggableRect.x + draggableRect.w
  );
  const bottom = Math.min(
    droppableRect.y + droppableRect.h,
    draggableRect.y + draggableRect.h
  );
  const width = right - left;
  const height = bottom - top;
  if (left < right && top < bottom) {
    const draggableArea = draggableRect.w * draggableRect.h;
    const droppableArea = droppableRect.w * droppableRect.h;
    const intersectionArea = width * height;
    return (
      intersectionArea / (draggableArea + droppableArea - intersectionArea)
    );
  }
  return 0;
}

export function isPointerWithin(mouseCoord: Coord, rect: Rect) {
  return (
    mouseCoord.x >= rect.x &&
    mouseCoord.x <= rect.x + rect.w &&
    mouseCoord.y >= rect.y &&
    mouseCoord.y <= rect.y + rect.h
  );
}

export function distanceBetween(p1: Coord, p2: Coord) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function centerOfRectangle(rect: Rect) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
  };
}

export function cornersOfRectangle({
  x,
  y,
  h,
  w,
}: Rect): [
  TopLeft: Coord,
  TopRight: Coord,
  BottomLeft: Coord,
  BottomRight: Coord
] {
  return [
    {
      x,
      y,
    },
    {
      x: x + w,
      y,
    },
    {
      x,
      y: y + h,
    },
    {
      x: x + w,
      y: y + h,
    },
  ];
}
