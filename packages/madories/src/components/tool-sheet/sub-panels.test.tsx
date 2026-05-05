import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { SubPanels } from "./sub-panels";

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
      <SubPanels tool={{ kind: "erase" }} onToolChange={() => {}} darkMode={false} />,
    );
    const selectHtml = renderToString(
      <SubPanels tool={{ kind: "select" }} onToolChange={() => {}} darkMode={false} />,
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
