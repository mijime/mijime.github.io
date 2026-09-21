import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ShareDialog } from "./share-dialog";

const URL = "https://mijime.github.io/apps/madories/?d=abcdefghij";

describe("ShareDialog", () => {
  it("QRのSVGパスとURLコピーUIを描く", () => {
    const html = renderToString(<ShareDialog url={URL} onClose={() => {}} />);
    expect(html).toContain("間取りを共有");
    expect(html).toContain("viewBox");
    expect(html).toContain("<path");
    expect(html).toContain("URLをコピー");
    expect(html).toContain("閉じる");
    expect(html).toContain(URL);
  });

  it("容量超過のURLではQRを描かずURLコピーを案内する", () => {
    const long = `https://mijime.github.io/apps/madories/?d=${"a".repeat(4000)}`;
    const html = renderToString(<ShareDialog url={long} onClose={() => {}} />);
    expect(html).toContain("収まりません");
    expect(html).not.toContain("<path");
  });
});
