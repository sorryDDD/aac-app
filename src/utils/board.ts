import type { Point } from '../types/aac';

export const BOARD_WIDTH = 1000;
export const BOARD_HEIGHT = 700;
export const GRID_SIZE = 50;
export const DEFAULT_ITEM_SIZE = 150;

export function snapPoint(point: Point, enabled: boolean): Point {
  if (!enabled) {
    return point;
  }

  return {
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE
  };
}

export function clampItem(point: Point, size: number): Point {
  return {
    x: Math.min(Math.max(point.x, 0), BOARD_WIDTH - size),
    y: Math.min(Math.max(point.y, 0), BOARD_HEIGHT - size)
  };
}

export function clientToBoardPoint(rect: DOMRect, clientX: number, clientY: number): Point {
  return {
    x: ((clientX - rect.left) / rect.width) * BOARD_WIDTH,
    y: ((clientY - rect.top) / rect.height) * BOARD_HEIGHT
  };
}

export function isInsideRect(rect: DOMRect, clientX: number, clientY: number): boolean {
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}
