import type { Cell, ItemType } from "../types";

export type ItemAction = "move" | "rotate" | "place" | "none";

export function resolveItemAction(args: {
  startIdx: number | null;
  endIdx: number | null;
  dragMoved: boolean;
  endCell: Cell;
  toolItemType: ItemType;
}): ItemAction {
  const { startIdx, endIdx, dragMoved, endCell, toolItemType } = args;
  if (startIdx === null || endIdx === null) {
    return "none";
  }
  if (startIdx !== endIdx) {
    return "move";
  }
  if (dragMoved) {
    return "none";
  }
  if (endCell.item && endCell.item.type === toolItemType) {
    return "rotate";
  }
  return "place";
}
