import { useMemo } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { effectiveEstimate } from "../lib/estimate";
import { scheduleNodes, type Schedule } from "../lib/schedule";
import type { MindNode } from "../types";

const PIXELS_PER_HOUR = 4;
const ROW_HEIGHT = 32;
const LEFT_COL_WIDTH = 280;
const ROW_PAD_X = 8;

function categoryBgColor(c: MindNode["categoryColor"]): string {
	switch (c) {
		case "sky": {
			return "#38bdf8";
		}
		case "emerald": {
			return "#10b981";
		}
		case "rose": {
			return "#fb7185";
		}
		default: {
			return "#94a3b8";
		}
	}
}

function dfs(
	nodes: Record<string, MindNode>,
	rootId: string,
): { node: MindNode; depth: number }[] {
	const out: { node: MindNode; depth: number }[] = [];
	const walk = (id: string, depth: number): void => {
		const node = nodes[id];
		if (!node) return;
		if (!node.isRoot) out.push({ node, depth });
		for (const cid of node.children) walk(cid, depth + 1);
	};
	walk(rootId, 0);
	return out;
}

function isOverdue(node: MindNode, schedule: Schedule | undefined): boolean {
	if (!node.dueDate) return false;
	if (!schedule) return false;
	const due = new Date(node.dueDate);
	due.setHours(0, 0, 0, 0);
	return schedule.end.getTime() > due.getTime();
}

function daysOverdue(node: MindNode, schedule: Schedule | undefined): number {
	if (!node.dueDate || !schedule) return 0;
	const due = new Date(node.dueDate);
	due.setHours(0, 0, 0, 0);
	const diff = schedule.end.getTime() - due.getTime();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function formatDate(d: Date): string {
	return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

function formatMonth(d: Date): string {
	return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function GanttBoard() {
	const { state } = useMindStore();
	const {nodes} = state;
	const root = Object.values(nodes).find((n) => n.isRoot);
	const startDate = useMemo(() => new Date(), []);
	const schedules = useMemo(() => {
		if (!root) return [];
		return scheduleNodes(nodes, startDate);
	}, [nodes, startDate, root]);
	const scheduleById = useMemo(() => {
		const m = new Map<string, Schedule>();
		for (const s of schedules) m.set(s.id, s);
		return m;
	}, [schedules]);
	const rows = root ? dfs(nodes, root.id) : [];
	const lastSchedule = schedules.at(-1);
	const totalHours = lastSchedule
		? Math.max(
				1,
				Math.ceil((lastSchedule.end.getTime() - startDate.getTime()) / 3_600_000),
			)
		: 0;
	const totalWidth = Math.max(totalHours * PIXELS_PER_HOUR, 320);

	const dayTicks: Date[] = [];
	if (lastSchedule) {
		const {end} = lastSchedule;
		let cursor = new Date(startDate);
		cursor.setHours(0, 0, 0, 0);
		while (cursor.getTime() <= end.getTime()) {
			dayTicks.push(new Date(cursor));
			cursor = new Date(cursor.getTime() + 86_400_000);
		}
	}

	const weekTicks: Date[] = dayTicks.filter((d) => d.getDay() === 1);
	const monthBoundaries: Date[] = [];
	for (let i = 0; i < dayTicks.length; i++) {
		if (i === 0 || dayTicks[i].getMonth() !== dayTicks[i - 1].getMonth()) {
			monthBoundaries.push(dayTicks[i]);
		}
	}

	return (
		<div
			data-testid="gantt-board"
			className="w-full h-full overflow-auto"
			style={{ background: "var(--paper)" }}
		>
			<div className="flex" style={{ minWidth: LEFT_COL_WIDTH + totalWidth }}>
				<div
					className="sticky left-0 z-10 shrink-0"
					style={{
						width: LEFT_COL_WIDTH,
						background: "var(--paper)",
						borderRight: "1px solid var(--border)",
					}}
				>
					<div
						className="text-[10px] uppercase tracking-wider px-2 py-2"
						style={{ color: "var(--mid)", height: ROW_HEIGHT, borderBottom: "1px solid var(--border)" }}
					>
						タスク
					</div>
					{rows.map(({ node, depth }) => {
						const sched = scheduleById.get(node.id);
						const est = effectiveEstimate(nodes, node.id);
						const overdue = isOverdue(node, sched);
						const od = daysOverdue(node, sched);
						return (
							<div
								key={node.id}
								data-testid={`gantt-row-${node.id}`}
								className="flex items-center justify-between px-2 text-sm"
								style={{
									height: ROW_HEIGHT,
									paddingLeft: ROW_PAD_X + depth * 16,
									borderBottom: "1px solid var(--border)",
								}}
							>
								<span className="truncate flex-1" style={{ color: "var(--ink)" }}>
									{node.text}
								</span>
								<span
									className="text-[10px] mr-2"
									style={{ color: "var(--mid)" }}
								>{`${est}h`}</span>
								{overdue && (
									<span
										className="text-[10px] px-1.5 rounded"
										style={{ background: "rgba(244,63,94,0.15)", color: "#be123c" }}
									>{`⚠ ${od}日超過`}</span>
								)}
							</div>
						);
					})}
				</div>
				<div className="relative shrink-0" style={{ width: totalWidth }}>
					<div
						className="sticky top-0 z-10 flex"
						style={{ height: ROW_HEIGHT, background: "var(--paper)", borderBottom: "1px solid var(--border)" }}
					>
						{weekTicks.map((d) => {
							const left = ((d.getTime() - startDate.getTime()) / 3_600_000) * PIXELS_PER_HOUR;
							const isMonth = monthBoundaries.some((m) => m.getTime() === d.getTime());
							return (
								<div
									key={`tick-${d.getTime()}`}
									className="absolute top-0 bottom-0 flex items-center pl-1 text-[10px]"
									style={{
										left,
										color: isMonth ? "var(--ink)" : "var(--mid)",
										fontWeight: isMonth ? 600 : 400,
									}}
								>
									{isMonth ? formatMonth(d) : formatDate(d)}
								</div>
							);
						})}
					</div>
					{rows.map(({ node, depth }) => {
						const sched = scheduleById.get(node.id);
						if (!sched) return null;
						const left = ((sched.start.getTime() - startDate.getTime()) / 3_600_000) * PIXELS_PER_HOUR;
						const width = Math.max(
							((sched.end.getTime() - sched.start.getTime()) / 3_600_000) * PIXELS_PER_HOUR,
							2,
						);
						const isLeaf = depth === 0 || node.children.length === 0;
						return (
							<div
								key={`bar-${node.id}`}
								className="relative"
								style={{
									height: ROW_HEIGHT,
									borderBottom: "1px solid var(--border)",
								}}
							>
								<div
									style={{
										position: "absolute",
										top: 6,
										left,
										width,
										height: ROW_HEIGHT - 12,
										background: categoryBgColor(node.categoryColor),
										opacity: isLeaf ? 0.7 : 1,
										borderRadius: 4,
									}}
								/>
							</div>
						);
					})}
					<div
						style={{
							position: "absolute",
							top: 0,
							bottom: 0,
							left: 0,
							width: 2,
							background: "#ef4444",
						}}
					/>
				</div>
			</div>
		</div>
	);
}
