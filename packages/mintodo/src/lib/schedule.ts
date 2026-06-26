import type { MindNode } from "../types";
import { effectiveEstimate } from "./estimate";

export interface Schedule {
	id: string;
	start: Date;
	end: Date;
	depth: number;
	estimateH: number;
}

const DEFAULT_HOURS_PER_DAY = 8;
const WORK_START_HOUR = 9;

function hoursUsedInDay(
	date: Date,
	hoursPerDay: number,
	workStartHour: number,
): number {
	const curHour = date.getHours() + date.getMinutes() / 60;
	if (curHour < workStartHour) return 0;
	if (curHour >= workStartHour + hoursPerDay) return hoursPerDay;
	return curHour - workStartHour;
}

export function addHours(
	date: Date,
	hours: number,
	hoursPerDay = DEFAULT_HOURS_PER_DAY,
	skipWeekends = true,
): Date {
	if (hours <= 0) return new Date(date);
	const cur = new Date(date);
	if (cur.getHours() < WORK_START_HOUR) {
		cur.setHours(WORK_START_HOUR, 0, 0, 0);
	}
	let remaining = hours;
	while (remaining > 0) {
		if (skipWeekends && (cur.getDay() === 0 || cur.getDay() === 6)) {
			cur.setDate(cur.getDate() + 1);
			cur.setHours(WORK_START_HOUR, 0, 0, 0);
			continue;
		}
		const usedToday = hoursUsedInDay(cur, hoursPerDay, WORK_START_HOUR);
		const capToday = hoursPerDay - usedToday;
		if (capToday <= 0) {
			cur.setDate(cur.getDate() + 1);
			cur.setHours(WORK_START_HOUR, 0, 0, 0);
			continue;
		}
		const consume = Math.min(remaining, capToday);
		cur.setTime(cur.getTime() + consume * 3_600_000);
		remaining -= consume;
		if (remaining > 0) {
			cur.setDate(cur.getDate() + 1);
			cur.setHours(WORK_START_HOUR, 0, 0, 0);
		}
	}
	return cur;
}

export function scheduleNodes(
	nodes: Record<string, MindNode>,
	startDate: Date,
	hoursPerDay = DEFAULT_HOURS_PER_DAY,
	skipWeekends = true,
): Schedule[] {
	const root = Object.values(nodes).find((n) => n.isRoot);
	if (!root) return [];
	const result: Schedule[] = [];
	let cursor = new Date(startDate);
	const walk = (id: string, depth: number): void => {
		const node = nodes[id];
		if (!node) return;
		const est = effectiveEstimate(nodes, id);
		const start = new Date(cursor);
		const end = addHours(start, est, hoursPerDay, skipWeekends);
		result.push({ id, start, end, depth, estimateH: est });
		cursor = end;
		for (const cid of node.children) walk(cid, depth + 1);
	};
	walk(root.id, 0);
	return result;
}
