import type { ItemType } from "../../types";
import { drawBathtub } from "./bathtub";
import { drawBed } from "./bed";
import { drawChair } from "./chair";
import { drawDesk, drawDeskLarge } from "./desk";
import { drawDoor } from "./door";
import { drawDoorSlide } from "./door_slide";
import { drawFridge } from "./fridge";
import { drawKitchen } from "./kitchen";
import { drawShelf } from "./shelf";
import { drawSofa } from "./sofa";
import { drawStairs } from "./stairs";
import { drawToilet } from "./toilet";
import { drawTv } from "./tv";
import { drawWashbasin } from "./washbasin";
import { drawWashbasinHalf } from "./washbasin_half";
import { drawWasher } from "./washer";

export type DrawFn = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  px: number,
  py: number,
  w: number,
  h: number,
  darkMode?: boolean,
) => void;

export const ICON_REGISTRY = new Map<ItemType, DrawFn>([
  ["door", drawDoor],
  ["door_slide", drawDoorSlide],
  ["stairs", drawStairs],
  ["chair", drawChair],
  ["desk", drawDesk],
  ["desk_large", drawDeskLarge],
  ["toilet", drawToilet],
  ["bathtub", drawBathtub],
  ["kitchen", drawKitchen],
  ["washbasin", drawWashbasin],
  ["washbasin_half", drawWashbasinHalf],
  ["washbasin_large", drawWashbasin],
  ["fridge", drawFridge],
  ["washer", drawWasher],
  ["shelf1", drawShelf],
  ["shelf2", drawShelf],
  ["tv", drawTv],
  ["sofa", drawSofa],
  ["bed_single", drawBed],
  ["bed_double", drawBed],
]);
