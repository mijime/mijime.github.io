import { useEffect, useRef, useState } from "react";
import { parseDSL, serializeDSL } from "../dsl";
import { useMindStore } from "../hooks/use-mind-store";

type SaveState =
	| { kind: "saved" }
	| { kind: "editing" }
	| { kind: "saving" }
	| { kind: "unsaved"; reason: string };

const DEBOUNCE_MS = 1000;

export function TextEditor() {
	const { state, dispatch } = useMindStore();
	const [text, setText] = useState(() => serializeDSL(state.nodes));
	const [saveState, setSaveState] = useState<SaveState>({ kind: "saved" });
	const timerRef = useRef<number | null>(null);
	const lastBoardIdRef = useRef(state.currentBoardId);

	useEffect(() => {
		if (lastBoardIdRef.current !== state.currentBoardId) {
			lastBoardIdRef.current = state.currentBoardId;
			setText(serializeDSL(state.nodes));
			setSaveState({ kind: "saved" });
		}
	}, [state.currentBoardId, state.nodes]);

	useEffect(() => {
		const serialized = serializeDSL(state.nodes);
		if (text === serialized) {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			setSaveState({ kind: "saved" });
			return;
		}
		const r = parseDSL(text, state.currentBoardId ?? "");
		if (!r.ok) {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			setSaveState({ kind: "unsaved", reason: r.reason });
			return;
		}
		setSaveState({ kind: "editing" });
		if (timerRef.current) window.clearTimeout(timerRef.current);
		timerRef.current = window.setTimeout(() => {
			setSaveState({ kind: "saving" });
			const r2 = parseDSL(text, state.currentBoardId ?? "");
			if (r2.ok) {
				dispatch({ type: "SET_NODES", nodes: r2.nodes });
				setSaveState({ kind: "saved" });
			} else {
				setSaveState({ kind: "unsaved", reason: r2.reason });
			}
			timerRef.current = null;
		}, DEBOUNCE_MS);
		return () => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [text, state.currentBoardId, state.nodes, dispatch]);

	return (
		<div data-testid="text-editor" className="w-full h-full flex flex-col overflow-hidden">
			<textarea
				data-testid="text-editor-textarea"
				value={text}
				onChange={(e) => setText(e.target.value)}
				spellCheck={false}
				className="flex-1 w-full px-8 py-6 text-base font-mono resize-none outline-none border-0"
				style={{
					background: "transparent",
					color: "var(--ink)",
				}}
			/>
			<div
				className="flex items-center justify-end gap-2 px-6 py-3 shrink-0"
				style={{ borderTop: "1px solid var(--border)" }}
			>
				<span
					data-testid="text-editor-save-state"
					className="text-xs px-2 py-1 rounded mr-auto"
					style={{
						background:
							saveState.kind === "unsaved" ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
						color: saveState.kind === "unsaved" ? "rgb(180, 83, 9)" : "rgb(21, 128, 61)",
					}}
					title={saveState.kind === "unsaved" ? saveState.reason : undefined}
				>
					{saveState.kind === "unsaved" ? "未保存" : "保存済み"}
				</span>
				<button
					type="button"
					data-testid="text-editor-reset"
					onClick={() => {
						setText(serializeDSL(state.nodes));
						setSaveState({ kind: "saved" });
					}}
					className="px-3 py-1.5 text-sm rounded transition"
					style={{
						background: "var(--paper)",
						border: "1px solid var(--border)",
						color: "var(--ink)",
					}}
				>
					リセット
				</button>
			</div>
		</div>
	);
}
