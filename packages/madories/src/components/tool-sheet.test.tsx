import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import {
  getToolModeForKind,
  PrimaryToolTabs,
} from "./tool-sheet/primary-tool-tabs";
import { SubPanels } from "./tool-sheet/sub-panels";
import { ActionTabs } from "./tool-sheet/action-tabs";
import type { ToolMode } from "./tool-mode";

describe("PrimaryToolTabs", () => {
  it("renders 5 tabs", () => {
    const html = renderToString(
      <PrimaryToolTabs
        tool={{ kind: "select" }}
        onToolChange={() => {}}
      />,
    );
    expect(html).toContain("壁");
    expect(html).toContain("床");
    expect(html).toContain("家具");
    expect(html).toContain("消す");
    expect(html).toContain("選択");
  });

  it("validates component structure", () => {
    const html = renderToString(
      <PrimaryToolTabs
        tool={{ kind: "select" }}
        onToolChange={() => {}}
      />,
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
      const html = renderToString(
        <PrimaryToolTabs tool={tool} onToolChange={() => {}} />,
      );
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

describe("SubPanels", () => {
  it("renders wall types when tool is wall", () => {
    const html = renderToString(
      <SubPanels
        tool={{ kind: "wall", wallType: "solid" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(html).toContain("壁");
    expect(html).toContain("開口部");
    expect(html).toContain("全窓");
  });

  it("renders floor types when tool is floor", () => {
    const html = renderToString(
      <SubPanels
        tool={{ kind: "floor", floorType: "wood" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(html).toContain("フローリング");
    expect(html).toContain("タイル");
  });

  it("renders item categories and items when tool is item", () => {
    const html = renderToString(
      <SubPanels
        tool={{ kind: "item", itemType: "door" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(html).toContain("建具");
    expect(html).toContain("開き戸");
  });

  it("renders nothing for erase/select", () => {
    const eraseHtml = renderToString(
      <SubPanels
        tool={{ kind: "erase" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    const selectHtml = renderToString(
      <SubPanels
        tool={{ kind: "select" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    expect(eraseHtml).not.toContain("壁");
    expect(selectHtml).not.toContain("壁");
  });

  it("filters items by the default category", () => {
    const html = renderToString(
      <SubPanels
        tool={{ kind: "item", itemType: "door" }}
        onToolChange={() => {}}
        darkMode={false}
      />,
    );
    // Default category is "建具", so these should be present
    expect(html).toContain("開き戸");
    expect(html).toContain("引き戸");
    // "水回り" items should not be rendered
    expect(html).not.toContain("トイレ");
    expect(html).not.toContain("浴槽");
  });
});

describe("ActionTabs", () => {
  it("renders 3 category tabs", () => {
    const html = renderToString(
      <ActionTabs
        canUndo={true}
        canRedo={false}
        onUndo={() => {}}
        onRedo={() => {}}
        onFitView={() => {}}
        onSave={() => {}}
        onLoad={() => {}}
        onExportAll={() => {}}
        onShare={() => {}}
        onClear={() => {}}
        onRotateFloor={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).toContain("編集");
    expect(html).toContain("ファイル");
    expect(html).toContain("操作");
  });
});
