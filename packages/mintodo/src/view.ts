import type { MindNode, View } from "./types";

const PADDING = 1.5;

export function computeCenterOnNode(node: { x: number; y: number }, currentZoom: number): View {
  return {
    pan: { x: -node.x * currentZoom, y: -node.y * currentZoom },
    zoom: currentZoom,
  };
}

export function computeFitView(
  nodes: Record<string, MindNode>,
  containerWidth: number,
  containerHeight: number,
): View {
  const list = Object.values(nodes);
  if (list.length === 0) {
    return { pan: { x: 0, y: 0 }, zoom: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of list) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }

  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  if (bboxW === 0 && bboxH === 0) {
    return { pan: { x: 0, y: 0 }, zoom: 1 };
  }

  const zoomX = containerWidth / (bboxW * PADDING);
  const zoomY = containerHeight / (bboxH * PADDING);
  let zoom = Math.min(zoomX, zoomY);
  zoom = Math.max(0.2, Math.min(3, zoom));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    pan: { x: -centerX * zoom, y: -centerY * zoom },
    zoom,
  };
}
