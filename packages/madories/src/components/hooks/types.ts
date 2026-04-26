export type ViewRef = React.MutableRefObject<{
  offsetX: number;
  offsetY: number;
  scale: number;
}>;
export type SelectionRef = React.MutableRefObject<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} | null>;
