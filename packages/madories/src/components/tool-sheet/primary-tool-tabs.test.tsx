import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { getToolModeForKind, PrimaryToolTabs } from "./primary-tool-tabs";
import type { ToolMode } from "../tool-mode";

describe("PrimaryToolTabs", () => {
  it("renders 5 tabs", () => {
    const html = renderToString(
      <PrimaryToolTabs tool={{ kind: "select" }} onToolChange={() => {}} />,
    );
    expect(html).toContain("壁");
    expect(html).toContain("床");
    expect(html).toContain("家具");
    expect(html).toContain("消す");
    expect(html).toContain("選択");
  });

  it("validates component structure", () => {
    const html = renderToString(
      <PrimaryToolTabs tool={{ kind: "select" }} onToolChange={() => {}} />,
    );

    // Verify all 5 buttons are rendered
    const buttonMatches = html.match(/<button/g);
    expect(buttonMatches).toHaveLength(5);

    // Verify SVG icons are present (lucide-react renders SVG)
    expect(html).toContain("<svg");
  });

  it("renders with each tab active without crashing", () => {
    const kinds: ToolMode["kind"][] = ["wall", "floor", "item", "erase", "select"];
    for (const kind of kinds) {
      const tool = getToolModeForKind(kind);
      const html = renderToString(<PrimaryToolTabs tool={tool} onToolChange={() => {}} />);
      expect(html).toContain("<button");
    }
  });
});

describe("getToolModeForKind", () => {
  it("returns correct ToolMode for wall", () => {
    expect(getToolModeForKind("wall")).toEqual({
      kind: "wall",
      wallType: "solid",
    });
  });

  it("returns correct ToolMode for floor", () => {
    expect(getToolModeForKind("floor")).toEqual({
      kind: "floor",
      floorType: "wood",
    });
  });

  it("returns correct ToolMode for item", () => {
    expect(getToolModeForKind("item")).toEqual({
      kind: "item",
      itemType: "door",
    });
  });

  it("returns correct ToolMode for erase", () => {
    expect(getToolModeForKind("erase")).toEqual({ kind: "erase" });
  });

  it("returns correct ToolMode for select", () => {
    expect(getToolModeForKind("select")).toEqual({ kind: "select" });
  });
});
