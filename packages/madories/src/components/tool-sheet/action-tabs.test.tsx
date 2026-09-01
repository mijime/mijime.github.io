import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ActionTabs } from "./action-tabs";

const baseProps = {
  canRedo: false,
  canUndo: true,
  onClear: () => {},
  onExportAll: () => {},
  onFitView: () => {},
  onLoad: () => {},
  onRedo: () => {},
  onRotateFloor: () => {},
  onSave: () => {},
  onShare: () => {},
  onToggleViewMode: () => {},
  onUndo: () => {},
  shearCheck: false,
  onToggleShear: () => {},
  onOpenDsl: () => {},
  viewMode: "2d" as const,
};

describe("ActionTabs", () => {
  it("renders the category tabs (edit/file/operation/inspect)", () => {
    const html = renderToString(<ActionTabs {...baseProps} onClose={() => {}} />);
    expect(html).toContain("編集");
    expect(html).toContain("ファイル");
    expect(html).toContain("操作");
    expect(html).toContain("検査");
  });

  it("renders edit actions by default", () => {
    const html = renderToString(<ActionTabs {...baseProps} onClose={() => {}} />);
    expect(html).toContain("戻す");
    expect(html).toContain("進む");
    expect(html).not.toContain("保存");
    expect(html).not.toContain("全体表示");
  });

  it("applies disabled state when canUndo is false", () => {
    const html = renderToString(<ActionTabs {...baseProps} canUndo={false} onClose={() => {}} />);
    expect(html).toContain('disabled=""');
    expect(html).toContain("opacity:0.4");
  });
});
