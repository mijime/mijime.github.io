import { useDraggable } from "@dnd-kit/core";
import { ListOrdered, Pencil } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { buildBreadcrumb } from "../lib/breadcrumb";
import type { MindNode } from "../types";
import { TaskCard } from "./TaskCard";

interface Props {
	node: MindNode;
}

export function KanbanCard({ node }: Props) {
	const { dispatch, state } = useMindStore();
	const breadcrumb = buildBreadcrumb(state.nodes, node.id);

	const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: node.id });

	return (
		<div
			ref={setNodeRef}
			data-testid={`kanban-card-${node.id}`}
			data-node-id={node.id}
			{...attributes}
			{...listeners}
			className="rounded border p-3 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
			style={{
				background: "var(--paper)",
				borderColor: "var(--border)",
				color: "var(--ink)",
				opacity: isDragging ? 0.4 : 1,
				touchAction: "none",
			}}
		>
			<div className="flex items-center justify-between">
				<span className="text-[10px] truncate" title={breadcrumb}>
					{breadcrumb}
				</span>
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						data-testid={`kanban-card-edit-${node.id}`}
						onClick={(e) => {
							e.stopPropagation();
							dispatch({
								modal: { kind: "edit", nodeId: node.id },
								type: "OPEN_MODAL",
							});
						}}
						onPointerDown={(e) => e.stopPropagation()}
					>
						<Pencil size={12} />
					</button>
					<button
						type="button"
						data-testid={`kanban-card-worklog-${node.id}`}
						onClick={(e) => {
							e.stopPropagation();
							dispatch({
								modal: { kind: "work-log", nodeId: node.id },
								type: "OPEN_MODAL",
							});
						}}
						onPointerDown={(e) => e.stopPropagation()}
						title="作業履歴"
					>
						<ListOrdered size={12} />
					</button>
				</div>
			</div>
			<TaskCard node={node} />
		</div>
	);
}
