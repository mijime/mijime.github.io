// The site's entry point: a thin wrapper that gives the app the two elements it
// wants (<canvas id="fx"> for the shared particle effects, and its own root) and
// then boots it. The app itself is plain TypeScript that owns its DOM — it is
// not React — so this stays a mount point and nothing more.
//
// The import is dynamic on purpose: fx.ts looks the canvas up when it is
// imported, so the elements have to exist in the document first.

import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

export function App(): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const container = host.current;
    if (!container) return;

    const fx = document.createElement("canvas");
    fx.id = "fx";
    const root = document.createElement("div");
    root.id = "app";
    container.append(fx, root);

    let cancelled = false;
    void import("../client/main")
      .then((app) => {
        if (!cancelled) app.mount(root, fx);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(String((cause as { message?: string })?.message ?? cause));
      });

    return () => {
      cancelled = true;
      fx.remove();
      root.remove();
    };
  }, []);

  return (
    <div className="otete" ref={host}>
      {error ? <p className="otete-error">よみこめなかった…（{error}）</p> : null}
    </div>
  );
}
