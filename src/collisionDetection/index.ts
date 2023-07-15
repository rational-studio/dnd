import type { CollisionDetectionAlgorithm } from '../store';
import {
  rectangleIntersection as _rectangleIntersection,
  centerOfRectangle,
  cornersOfRectangle,
  distanceBetween,
  isPointerWithin,
} from './algorithms';

export const rectangleIntersection: CollisionDetectionAlgorithm = (
  droppableItems,
  draggableRect
) => {
  const collisionInfo = droppableItems
    .map(item => {
      const droppableRect = item.boundingClientRect();
      return {
        item,
        ratio: _rectangleIntersection(droppableRect, draggableRect),
      };
    })
    .filter(({ ratio }) => ratio > 0)
    .sort((a, b) => b.ratio - a.ratio);

  return collisionInfo.map(info => info.item);
};

export const pointerWithin: CollisionDetectionAlgorithm = (
  droppableItems,
  _,
  mouseCoord
) => {
  const collisionInfo = droppableItems
    .map(item => {
      const rect = item.boundingClientRect();
      return {
        item,
        effectiveDistance: isPointerWithin(mouseCoord, rect)
          ? cornersOfRectangle(rect).reduce(
              (accum, corner) => accum + distanceBetween(mouseCoord, corner),
              0
            ) / 4
          : Infinity,
      };
    })
    .filter(item => Number.isFinite(item.effectiveDistance))
    .sort((a, b) => a.effectiveDistance - b.effectiveDistance);
  return collisionInfo.map(info => info.item);
};

export const closestCenter: CollisionDetectionAlgorithm = (
  droppableItems,
  draggableRect
) => {
  const draggableCenter = centerOfRectangle(draggableRect);
  const collisionInfo = droppableItems
    .map(item => {
      const droppableCenter = centerOfRectangle(item.boundingClientRect());
      return {
        item,
        distance: distanceBetween(draggableCenter, droppableCenter),
      };
    })
    .sort((a, b) => a.distance - b.distance);
  return collisionInfo.map(info => info.item);
};

export const closestCorners: CollisionDetectionAlgorithm = (
  droppableItems,
  draggableRect
) => {
  const draggableCorners = cornersOfRectangle(draggableRect);
  const collisionInfo = droppableItems
    .map(item => {
      const rect = item.boundingClientRect();
      const droppableCorners = cornersOfRectangle(rect);
      return {
        item,
        effectiveDistance:
          draggableCorners.reduce(
            (accum, corner, index) =>
              accum + distanceBetween(droppableCorners[index], corner),
            0
          ) / 4,
      };
    })
    .sort((a, b) => a.effectiveDistance - b.effectiveDistance);
  return collisionInfo.map(info => info.item);
};
