import { describe, expect, it } from "vitest";
import { previousStatus } from "./status-cycle";
import type { TaskStatus } from "../types";

describe("previousStatus", () => {
  const cases: Array<[TaskStatus, TaskStatus]> = [
    ["done", "review"],
    ["review", "wip"],
    ["wip", "inbox"],
    ["inbox", "done"],
  ];
  for (const [from, to] of cases) {
    it(`cycles ${from} → ${to}`, () => {
      expect(previousStatus(from)).toBe(to);
    });
  }
});
