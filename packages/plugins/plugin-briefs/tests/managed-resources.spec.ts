import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest, {
  BRIEFING_ANALYST_AGENT_KEY,
  BRIEFS_MANAGED_ROUTINE_KEYS,
  BRIEFS_MANAGED_SKILL_CANONICAL_KEYS,
  BRIEFS_MANAGED_SKILL_KEYS,
  BRIEFS_PROJECT_KEY,
  MANUAL_REFRESH_ROUTINE_KEY,
} from "../src/manifest.js";
import plugin from "../src/worker.js";

const companyId = "11111111-1111-4111-8111-111111111111";
const bridgeActor = {
  actorType: "user" as const,
  actorId: "signed-in-user",
  userId: "signed-in-user",
  agentId: null,
  runId: null,
  source: "session",
};

describe("Briefs managed resources", () => {
  it("declares the Briefing Analyst, skills, routines, and agent tools", () => {
    expect(manifest.capabilities).toEqual(expect.arrayContaining([
      "agents.resume",
      "agents.managed",
      "skills.managed",
      "routines.managed",
      "agent.tools.register",
    ]));
    expect(manifest.agents?.[0]).toMatchObject({
      agentKey: BRIEFING_ANALYST_AGENT_KEY,
      displayName: "Briefing Analyst",
      status: "paused",
      capabilities: expect.stringContaining("writes grounded card titles and descriptions"),
      budgetMonthlyCents: 500,
      adapterConfig: {
        dangerouslyBypassApprovalsAndSandbox: true,
        extraArgs: ["--skip-git-repo-check"],
        paperclipSkillSync: {
          desiredSkills: BRIEFS_MANAGED_SKILL_CANONICAL_KEYS,
        },
      },
      permissions: {
        pluginTools: [manifest.id],
      },
    });
    expect(manifest.agents?.[0]?.instructions?.content).toContain("You are the LLM that generates Briefing card titles and descriptions");
    expect(manifest.agents?.[0]?.instructions?.content).toContain('summaryModel: "agent-generated"');
    expect(manifest.agents?.[0]?.instructions?.content).toContain("executive standup updates");
    expect(manifest.agents?.[0]?.instructions?.content).toContain("Do not put issue identifiers");
    expect(manifest.agents?.[0]?.instructions?.content).toContain("focus more on what is left to do");
    expect(manifest.skills?.find((skill) => skill.skillKey === "briefs-update-cards")?.markdown).toContain("refresh every visible card");
    expect(manifest.routines?.find((routine) => routine.routineKey === "briefs-update-cards")?.description).toContain("manual/API runs are rewrite passes");
    expect(manifest.skills?.map((skill) => skill.skillKey)).toEqual([...BRIEFS_MANAGED_SKILL_KEYS]);
    expect(manifest.routines?.map((routine) => routine.routineKey)).toEqual([...BRIEFS_MANAGED_ROUTINE_KEYS]);
    expect(manifest.routines?.find((routine) => routine.routineKey === MANUAL_REFRESH_ROUTINE_KEY)).toMatchObject({
      assigneeRef: { resourceKind: "agent", resourceKey: BRIEFING_ANALYST_AGENT_KEY },
      projectRef: { resourceKind: "project", resourceKey: BRIEFS_PROJECT_KEY },
      issueTemplate: {
        surfaceVisibility: "plugin_operation",
        billingCode: "plugin-briefs:manual-refresh",
      },
    });
    expect(manifest.tools?.map((tool) => tool.name)).toEqual([
      "briefs_list_cards",
      "briefs_save_card",
      "briefs_refresh_issue_tree",
    ]);
    expect(manifest.tools?.find((tool) => tool.name === "briefs_refresh_issue_tree")?.description).toContain("inspect deterministic rows");
    expect(manifest.ui?.slots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "sidebar",
        displayName: "Briefing",
        exportName: "SidebarLink",
      }),
      expect.objectContaining({
        type: "page",
        displayName: "Briefing",
        routePath: "briefs",
        exportName: "BriefingPage",
      }),
      expect.objectContaining({
        type: "settingsPage",
        displayName: "Briefing",
        exportName: "SettingsPage",
      }),
    ]));
  });

  it("can reset the managed analyst when declared instructions change", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup?.(harness.ctx);
    await harness.performAction("reconcile-managed-resources", { companyId });

    const result = await harness.performAction<{ status: string; agentId: string | null }>(
      "reset-managed-agent",
      { companyId },
    );

    expect(result).toMatchObject({ status: "reset" });
    expect(result.agentId).toBeTruthy();
  });

  it("can reset managed skills and routines when declared defaults change", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup?.(harness.ctx);
    await harness.performAction("reconcile-managed-resources", { companyId });

    const skills = await harness.performAction<{ managedSkills: Array<{ status: string; skillId: string | null }> }>(
      "reset-managed-skills",
      { companyId },
    );
    const routine = await harness.performAction<{ status: string; routineId: string | null }>(
      "reset-managed-routine",
      { companyId, routineKey: MANUAL_REFRESH_ROUTINE_KEY },
    );

    expect(skills.managedSkills.map((skill) => skill.status)).toEqual(["reset", "reset"]);
    expect(skills.managedSkills.every((skill) => skill.skillId)).toBe(true);
    expect(routine).toMatchObject({ status: "reset" });
    expect(routine.routineId).toBeTruthy();
  });

  it("reconciles resources in dependency order so routines resolve their managed refs", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup?.(harness.ctx);

    const result = await harness.performAction<{
      managedProject: { status: string; projectId: string | null };
      managedAgent: { status: string; agentId: string | null };
      managedSkills: Array<{ status: string; skillId: string | null }>;
      managedRoutines: Array<{ status: string; routineId: string | null; missingRefs: unknown[] }>;
    }>("reconcile-managed-resources", { companyId });

    expect(result.managedProject).toMatchObject({ status: "created" });
    expect(result.managedAgent).toMatchObject({ status: "created" });
    expect(result.managedSkills.map((skill) => skill.status)).toEqual(["created", "created"]);
    expect(result.managedRoutines).toHaveLength(3);
    for (const routine of result.managedRoutines) {
      expect(routine.status).toBe("created");
      expect(routine.routineId).toBeTruthy();
      expect(routine.missingRefs).toEqual([]);
    }
  });

  it("resumes the managed analyst before running user briefing routines", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup?.(harness.ctx);
    await harness.performAction("reconcile-managed-resources", { companyId });

    const before = await harness.ctx.agents.managed.get(BRIEFING_ANALYST_AGENT_KEY, companyId);
    expect(before.agent?.status).toBe("paused");

    const result = await harness.performAction<{
      runs: Array<{ status: string; triggerPayload: { variables: Record<string, unknown> } | null }>;
    }>("run-briefing-routines", { companyId }, { actor: bridgeActor });

    const after = await harness.ctx.agents.managed.get(BRIEFING_ANALYST_AGENT_KEY, companyId);
    expect(after.agent?.status).toBe("idle");
    expect(result.runs).toHaveLength(2);
    expect(result.runs.map((run) => run.status)).toEqual(["queued", "queued"]);
    expect(result.runs.map((run) => run.triggerPayload?.variables?.userId)).toEqual([
      "signed-in-user",
      "signed-in-user",
    ]);
  });

  it("rejects user-scoped UI bridge calls for a different user", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup?.(harness.ctx);
    const victimParams = { companyId, userId: "victim-user" };
    const context = { actor: bridgeActor };

    await expect(harness.getData("page", victimParams, context)).rejects.toThrow("Briefs user scope mismatch");
    await expect(harness.getData("preferences", victimParams, context)).rejects.toThrow("Briefs user scope mismatch");
    await expect(harness.performAction("pin-card", {
      ...victimParams,
      cardId: "card-1",
      pinned: true,
    }, context)).rejects.toThrow("Briefs user scope mismatch");
    await expect(harness.performAction("update-preferences", {
      ...victimParams,
      cadence: "daily",
    }, context)).rejects.toThrow("Briefs user scope mismatch");
  });
});
