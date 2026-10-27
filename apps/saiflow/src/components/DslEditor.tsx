import { useEffect, useRef, useState } from "react";
import { Textarea } from "@mijime/theme/ui";
import { useSaiflowDispatch, useSaiflowState } from "../store";

export function DslEditor() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  const draftRef = useRef(state.dslText);
  const [draft, setDraft] = useState(state.dslText);

  // Adopt changes that did not come from this textarea (restore, opening a
  // document, switching from the GUI editor).
  useEffect(() => {
    if (state.dslText !== draftRef.current) {
      draftRef.current = state.dslText;
      setDraft(state.dslText);
    }
  }, [state.dslText]);

  const handleChange = (text: string) => {
    draftRef.current = text;
    setDraft(text);
    // Parsing is cheap; updating immediately keeps the shared parser in sync
    // even if the user switches tabs right after typing.
    dispatch({ type: "SET_DSL", text });
  };

  const errors = state.parsed && "errors" in state.parsed ? state.parsed.errors : null;
  const lines = state.dslText.split("\n");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-(--border)">
        <span className="text-xs text-(--ink) opacity-60">DSL</span>
        {errors && (
          <span className="text-xs text-red-500">
            エラーあり<span className="opacity-50">（結果は最終正常値）</span>
          </span>
        )}
        {state.parsed && "config" in state.parsed && (
          <span className="text-xs text-green-500">解析OK</span>
        )}
      </div>
      <Textarea
        aria-label="DSL"
        className="flex-1 resize-none font-mono text-sm"
        value={draft}
        placeholder={`# 現状維持\n,初期現金,35,35,現金+1000\n,年収(夫),35,55,現金+500\n,生活費,35,,現金-168`}
        onChange={(e) => handleChange(e.currentTarget.value)}
        spellCheck={false}
      />
      {errors && (
        <div className="p-2 border-t border-(--border) text-xs text-red-500 max-h-40 overflow-y-auto space-y-0.5">
          {errors.map((e, i) => {
            const source = lines[e.line - 1] ?? "";
            return (
              <div key={i}>
                <div>
                  L{e.line}: {e.message}
                </div>
                {source.trim() && (
                  <code className="block pl-5 text-[10px] text-(--ink) opacity-40 truncate font-mono">
                    {source.trim()}
                  </code>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
