import {
  IssueRow as PluginIssueRow,
  ManagedRoutinesList as PluginManagedRoutinesList,
  useHostNavigation,
  usePluginAction,
  usePluginData,
  usePluginToast,
  type IssueRowIssue,
  type ManagedRoutinesListItem,
  type PluginPageProps,
  type PluginSettingsPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  BriefCard,
  BriefCardSource,
  BriefTaskRow,
} from "../contracts.js";
import {
  countAttention,
  formatRelative,
  sortBriefCards,
} from "./view-model.js";

const fontStack = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

const tokens = {
  bg: "var(--background, oklch(0.145 0 0))",
  card: "var(--card, oklch(0.205 0 0))",
  border: "var(--border, oklch(0.269 0 0))",
  fg: "var(--foreground, oklch(0.985 0 0))",
  muted: "var(--muted-foreground, oklch(0.708 0 0))",
  accent: "var(--accent, oklch(0.269 0 0))",
  primary: "var(--primary, oklch(0.985 0 0))",
};

const toneColors: Record<"red" | "warning" | "violet" | "cyan" | "green" | "muted", { accent: string; badgeBg: string; badgeFg: string }> = {
  red: { accent: "oklch(0.62 0.21 25)", badgeBg: "oklch(0.27 0.09 25)", badgeFg: "oklch(0.85 0.14 25)" },
  warning: { accent: "oklch(0.72 0.15 70)", badgeBg: "oklch(0.27 0.07 70)", badgeFg: "oklch(0.85 0.11 70)" },
  violet: { accent: "oklch(0.62 0.18 305)", badgeBg: "oklch(0.27 0.07 305)", badgeFg: "oklch(0.84 0.11 305)" },
  cyan: { accent: "oklch(0.7 0.13 200)", badgeBg: "oklch(0.27 0.06 200)", badgeFg: "oklch(0.84 0.11 200)" },
  green: { accent: "oklch(0.65 0.16 145)", badgeBg: "oklch(0.27 0.06 145)", badgeFg: "oklch(0.84 0.1 145)" },
  muted: { accent: "oklch(0.5 0 0)", badgeBg: "oklch(0.25 0 0)", badgeFg: "oklch(0.75 0 0)" },
};

const sourceKindIcon: Record<BriefCardSource["sourceKind"], string> = {
  issue: "●",
  issue_tree: "●",
  comment: "❝",
  run: "▷",
  document: "▤",
  work_product: "✱",
  interaction: "?",
  activity_event: "•",
  approval: "✓",
};

type PageData = {
  cards: BriefCard[];
  fetchedAt: string;
};

const DISCOVER_CARDS_ROUTINE_KEY = "briefs-discover-cards";
const UPDATE_CARDS_ROUTINE_KEY = "briefs-update-cards";
const MANUAL_REFRESH_ROUTINE_KEY = "briefs-manual-refresh";

const ROUTINE_FALLBACKS: Record<string, { title: string; schedule: string | null }> = {
  [DISCOVER_CARDS_ROUTINE_KEY]: { title: "Discover Briefing cards", schedule: "0 */6 * * *" },
  [UPDATE_CARDS_ROUTINE_KEY]: { title: "Update Briefing cards", schedule: "0 * * * *" },
  [MANUAL_REFRESH_ROUTINE_KEY]: { title: "Refresh Briefing card", schedule: "Manual" },
};

export function SidebarLink({ context }: PluginSidebarProps) {
  const nav = useHostNavigation();
  const params = useMemo(() => ({ companyId: context.companyId ?? "" }), [context.companyId]);
  const enabled = Boolean(params.companyId);
  const { data } = usePluginData<{ cards: BriefCard[] }>("cards", enabled ? params : undefined);

  const cards = data?.cards ?? [];
  const count = useMemo(() => countAttention(cards), [cards]);

  const link = nav.linkProps("/briefs");
  return (
    <a
      {...link}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 6,
        color: tokens.fg,
        textDecoration: "none",
        fontSize: 13,
        fontFamily: fontStack,
      }}
    >
      <BriefingSidebarIcon />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>Briefing</span>
      {count > 0 ? <AttentionBadge count={count} /> : null}
    </a>
  );
}

function BriefingSidebarIcon() {
  return (
    <svg
      aria-hidden="true"
      data-briefs-sidebar-icon
      viewBox="0 0 16 16"
      style={{ width: 16, height: 16, color: "currentColor", flexShrink: 0 }}
      fill="none"
    >
      <path
        d="M3.5 2.5h7.25c.97 0 1.75.78 1.75 1.75v7.25H4.25A1.75 1.75 0 0 1 2.5 9.75v-5.5c0-.97.78-1.75 1.75-1.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M5.25 5.25h4.5M5.25 7.5h3.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.5 5.5h1v6a2 2 0 0 1-2 2H5.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AttentionBadge({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} brief${count === 1 ? "" : "s"} need your attention`}
      style={{
        minWidth: 18,
        padding: "0 6px",
        height: 18,
        borderRadius: 9,
        background: toneColors.warning.badgeBg,
        color: toneColors.warning.badgeFg,
        fontSize: 11,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function BriefingPage({ context }: PluginPageProps) {
  const params = useMemo(() => ({ companyId: context.companyId ?? "" }), [context.companyId]);
  const enabled = Boolean(params.companyId);
  const { data, loading, error, refresh } = usePluginData<PageData>("page", enabled ? params : undefined);

  if (!enabled) {
    return (
      <PageShell>
        <EmptyState
          title="Choose a company"
          body="Briefing cards are company-scoped."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      meta={data ? <PageMeta data={data} /> : null}
      action={<RefreshButton onClick={refresh} loading={loading} />}
    >
      {error ? (
        <ErrorPanel message={error.message} onRetry={refresh} />
      ) : loading && !data ? (
        <LoadingState />
      ) : data && data.cards.length === 0 ? (
        <EmptyState
          title="No briefs yet"
          body="Cards appear here once the Briefing Analyst picks up recent work. Pinned cards never expire."
        />
      ) : data ? (
        <PageBody data={data} onChanged={refresh} />
      ) : null}
    </PageShell>
  );
}

type ManagedAgent = {
  status: string;
  agentId?: string | null;
  agent?: { id?: string; name?: string; status?: string | null; adapterType?: string | null; icon?: string | null } | null;
  defaultDrift?: { entryFile: string; changedFiles: string[] } | null;
};

type ManagedProject = {
  status: string;
  projectId?: string | null;
  project?: { id?: string; name?: string; status?: string | null; color?: string | null } | null;
};

type ManagedSkill = {
  status: string;
  skillId?: string | null;
  resourceKey?: string | null;
  skill?: { id?: string; name?: string; key?: string; description?: string | null } | null;
};

type ManagedRoutine = {
  status: string;
  routineId?: string | null;
  resourceKey?: string | null;
  missingRefs?: Array<{ resourceKind: string; resourceKey: string }>;
  routine?: {
    id?: string;
    title?: string;
    status?: string;
    projectId?: string | null;
    assigneeAgentId?: string | null;
    lastTriggeredAt?: string | Date | null;
    managedByPlugin?: { pluginDisplayName?: string; resourceKey?: string } | null;
  } | null;
};

type SettingsData = {
  managedAgent: ManagedAgent;
  managedProject: ManagedProject;
  managedSkills: ManagedSkill[];
  managedRoutines: ManagedRoutine[];
  agentOptions: Array<{ id: string; name: string; status?: string | null; adapterType?: string | null; icon?: string | null }>;
  projectOptions: Array<{ id: string; name: string; status?: string | null; color?: string | null }>;
};

export function SettingsPage({ context }: PluginSettingsPageProps) {
  const params = useMemo(() => ({ companyId: context.companyId ?? "" }), [context.companyId]);
  const enabled = Boolean(params.companyId);
  const settings = usePluginData<SettingsData>("settings", enabled ? params : undefined);
  const reconcileResources = usePluginAction("reconcile-managed-resources");
  const reconcileRoutine = usePluginAction("reconcile-managed-routine");
  const updateRoutineStatus = usePluginAction("update-managed-routine-status");
  const runRoutine = usePluginAction("run-managed-routine");
  const runBriefingRoutines = usePluginAction("run-briefing-routines");
  const toast = usePluginToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!enabled) {
    return <SettingsShell><Callout>Choose a company to view Briefing settings.</Callout></SettingsShell>;
  }
  if (settings.loading && !settings.data) {
    return <SettingsShell><Tiny>Loading Briefing settings...</Tiny></SettingsShell>;
  }
  if (settings.error) {
    return <SettingsShell><Callout tone="danger">{settings.error.message}</Callout></SettingsShell>;
  }
  if (!settings.data) {
    return <SettingsShell><Tiny>No settings available.</Tiny></SettingsShell>;
  }

  const data = settings.data;
  const managedRoutineItems = buildManagedRoutineItems(data.managedRoutines);
  const assigneeAgentId = data.managedAgent.agentId ?? data.managedAgent.agent?.id ?? null;
  const projectId = data.managedProject.projectId ?? data.managedProject.project?.id ?? null;
  const resourcesHealthy = resourceReady(data.managedAgent) && resourceReady(data.managedProject)
    && data.managedSkills.every(resourceReady)
    && data.managedRoutines.every(resourceReady);

  async function syncAll() {
    setBusy("sync");
    try {
      await reconcileResources({ companyId: params.companyId });
      toast({ tone: "success", title: "Managed resources synced" });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: "Sync failed", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function runForCurrentUser() {
    setBusy("run-all");
    try {
      await runBriefingRoutines({
        companyId: params.companyId,
        ...(context.userId ? { userId: context.userId } : {}),
        assigneeAgentId,
        projectId,
      });
      toast({ tone: "success", title: "Briefing routines queued" });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: "Routine run failed", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function runOne(routine: ManagedRoutinesListItem) {
    if (routine.resourceKey === MANUAL_REFRESH_ROUTINE_KEY) {
      toast({ tone: "warn", title: "Open a card to refresh one issue tree" });
      return;
    }
    setBusy(`run:${routine.key}`);
    try {
      await runRoutine({
        companyId: params.companyId,
        routineKey: routine.resourceKey ?? routine.key,
        ...(context.userId ? { userId: context.userId } : {}),
        assigneeAgentId: routine.assigneeAgentId ?? assigneeAgentId,
        projectId: routine.projectId ?? projectId,
        variables: context.userId ? { userId: context.userId } : undefined,
      });
      toast({ tone: "success", title: "Routine queued" });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: "Routine run failed", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function toggleRoutine(routine: ManagedRoutinesListItem, enabledNow: boolean) {
    if (!routine.resourceKey) return;
    setBusy(`status:${routine.key}`);
    try {
      await updateRoutineStatus({
        companyId: params.companyId,
        routineKey: routine.resourceKey,
        status: enabledNow ? "paused" : "active",
      });
      toast({ tone: "success", title: enabledNow ? "Routine paused" : "Routine enabled" });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: "Routine update failed", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function repairRoutine(routine: ManagedRoutinesListItem) {
    if (!routine.resourceKey) return;
    setBusy(`repair:${routine.key}`);
    try {
      await reconcileRoutine({
        companyId: params.companyId,
        routineKey: routine.resourceKey,
        assigneeAgentId,
        projectId,
      });
      toast({ tone: "success", title: "Routine reconciled" });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: "Routine repair failed", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <SettingsShell>
      <section style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>Managed resources</h2>
            <Tiny>{resourcesHealthy ? "Agent, project, skills, and routines are linked." : "Some managed resources need sync."}</Tiny>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SettingsButton onClick={syncAll} loading={busy === "sync"} primary>Sync resources</SettingsButton>
            <SettingsButton onClick={runForCurrentUser} loading={busy === "run-all"}>Run for me</SettingsButton>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, maxWidth: 700 }}>
          <ResourceStatus label="Briefing Analyst" status={data.managedAgent.status} detail={data.managedAgent.agent?.name ?? data.managedAgent.agentId ?? "Not linked"} />
          <ResourceStatus label="Briefs project" status={data.managedProject.status} detail={data.managedProject.project?.name ?? data.managedProject.projectId ?? "Not linked"} />
          <ResourceStatus label="Managed skills" status={aggregateStatus(data.managedSkills)} detail={`${data.managedSkills.filter(resourceReady).length}/${data.managedSkills.length} synced`} />
          <ResourceStatus label="Managed routines" status={aggregateStatus(data.managedRoutines)} detail={`${data.managedRoutines.filter(resourceReady).length}/${data.managedRoutines.length} synced`} />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 650 }}>Routines</h3>
          <PluginManagedRoutinesList
            routines={managedRoutineItems}
            agents={data.agentOptions}
            projects={data.projectOptions}
            pluginDisplayName="Briefs"
            runningRoutineKey={busy?.startsWith("run:") ? busy.slice(4) : null}
            statusMutationRoutineKey={busy?.startsWith("status:") ? busy.slice(7) : null}
            reconcilingRoutineKey={busy?.startsWith("repair:") ? busy.slice(7) : null}
            onRunNow={runOne}
            onToggleEnabled={toggleRoutine}
            onReconcile={repairRoutine}
          />
        </div>
      </section>
    </SettingsShell>
  );
}

function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: fontStack, color: tokens.fg, display: "grid", gap: 18, maxWidth: 900, minWidth: 0 }}>
      {children}
    </div>
  );
}

function Tiny({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 12, color: tokens.muted }}>{children}</span>;
}

function Callout({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "danger" }) {
  const danger = tone === "danger";
  return (
    <div
      style={{
        border: `1px solid ${danger ? toneColors.red.accent : tokens.border}`,
        background: danger ? toneColors.red.badgeBg : tokens.card,
        color: danger ? toneColors.red.badgeFg : tokens.fg,
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function SettingsButton({ children, onClick, loading = false, disabled = false, primary = false }: {
  children: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: primary ? "1px solid transparent" : `1px solid ${tokens.border}`,
        background: primary ? tokens.primary : tokens.card,
        color: primary ? "var(--primary-foreground, oklch(0.205 0 0))" : tokens.fg,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {loading ? "Working..." : children}
    </button>
  );
}

function ResourceStatus({ label, status, detail }: { label: string; status: string; detail: string }) {
  const ok = status === "resolved" || status === "created" || status === "relinked" || status === "reset";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 0.45fr) minmax(0, 1fr) auto", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${tokens.border}` }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: tokens.muted, fontSize: 12 }}>{detail}</span>
      <BadgeLike tone={ok ? "good" : "warn"}>{statusLabel(status)}</BadgeLike>
    </div>
  );
}

function BadgeLike({ tone, children }: { tone: "good" | "warn"; children: ReactNode }) {
  const colors = tone === "good" ? toneColors.green : toneColors.warning;
  return (
    <span style={{ borderRadius: 999, padding: "2px 7px", fontSize: 11, fontWeight: 650, background: colors.badgeBg, color: colors.badgeFg }}>
      {children}
    </span>
  );
}

function buildManagedRoutineItems(routines: ManagedRoutine[]): ManagedRoutinesListItem[] {
  return routines.map((routine) => {
    const key = routine.resourceKey ?? routine.routineId ?? "managed-routine";
    const fallback = ROUTINE_FALLBACKS[key] ?? { title: key, schedule: null };
    const status = routine.routine?.status ?? (routine.status === "missing" || routine.status === "missing_refs" ? "paused" : routine.status);
    return {
      key,
      title: routine.routine?.title ?? fallback.title,
      status,
      routineId: routine.routineId ?? routine.routine?.id ?? null,
      href: routine.routineId ? `/routines/${routine.routineId}` : null,
      resourceKey: routine.resourceKey ?? key,
      projectId: routine.routine?.projectId ?? null,
      assigneeAgentId: routine.routine?.assigneeAgentId ?? null,
      cronExpression: fallback.schedule,
      lastRunAt: routine.routine?.lastTriggeredAt ?? null,
      managedByPluginDisplayName: routine.routine?.managedByPlugin?.pluginDisplayName ?? "Briefs",
      missingRefs: routine.missingRefs,
    };
  });
}

function resourceReady(resource: { status: string }) {
  return resource.status === "resolved" || resource.status === "created" || resource.status === "relinked" || resource.status === "reset";
}

function aggregateStatus(resources: Array<{ status: string }>) {
  if (resources.length === 0) return "missing";
  return resources.every(resourceReady) ? "resolved" : "missing";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function PageShell({ children, meta, action }: {
  children: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div style={{ fontFamily: fontStack, color: tokens.fg, padding: "20px clamp(12px, 4vw, 32px)", maxWidth: 1280, margin: "0 auto", minHeight: "100vh" }}>
      <header data-briefs-page-header style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.2 }}>Briefing</h1>
        <div data-briefs-page-meta style={{ flex: 1, minWidth: 0, fontSize: 12, color: tokens.muted, overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {action}
        </div>
      </header>
      {children}
    </div>
  );
}

function PageMeta({ data }: { data: PageData }) {
  const active = data.cards.filter((c) => !c.hidden);
  const pinned = active.filter((c) => c.pinned).length;
  return (
    <span>
      {active.length} work {active.length === 1 ? "area" : "areas"} · {pinned} pinned · refreshed {formatRelative(data.fetchedAt)}
    </span>
  );
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: `1px solid ${tokens.border}`,
        background: tokens.card,
        color: tokens.fg,
        fontSize: 12,
        cursor: loading ? "wait" : "pointer",
        fontFamily: fontStack,
      }}
    >
      {loading ? "Refreshing…" : "Refresh"}
    </button>
  );
}

function PageBody({ data, onChanged }: { data: PageData; onChanged: () => void }) {
  const cards = useMemo(() => sortBriefCards(data.cards), [data.cards]);

  return (
    <section data-briefs-list style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 980 }}>
      <header style={{ display: "grid", gap: 4, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 650, lineHeight: 1.2, maxWidth: 520 }}>
          Recent work and next steps
        </h2>
        <div style={{ fontSize: 12, color: tokens.muted }}>
          Sorted by the latest meaningful activity across the work areas Briefing is tracking.
        </div>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cards.map((card) => (
          <BriefCardView key={card.id} card={card} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

export function BriefCardView({ card, onChanged }: { card: BriefCard; onChanged: () => void }) {
  const pin = usePluginAction("pin-card");
  const toast = usePluginToast();
  const taskRows = useMemo(() => dedupeTaskRows(card.snapshot.taskRows), [card.snapshot.taskRows]);

  const togglePin = useCallback(async () => {
    try {
      await pin({ companyId: card.companyId, userId: card.userId, cardId: card.id, pinned: !card.pinned });
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update pin";
      toast({ tone: "error", title: "Pin failed", body: message });
    }
  }, [pin, card, onChanged, toast]);

  return (
    <article
      data-briefs-card
      data-state={card.state}
      data-summary-status={card.snapshot.summaryStatus}
      data-pinned={card.pinned ? "true" : "false"}
      style={{
        background: tokens.card,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
        <PinButton pinned={card.pinned} onToggle={togglePin} />
        <h3 style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 650, lineHeight: 1.28, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3 }}>
          {card.title}
        </h3>
      </header>
      <MetaRow card={card} />
      <SummarySlot card={card} />
      <SourceRows rows={taskRows} />
    </article>
  );
}

function PinButton({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin card" : "Pin card"}
      style={{
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: 6,
        border: `1px solid ${pinned ? "oklch(0.8 0.13 80)" : tokens.border}`,
        background: pinned ? "oklch(0.4 0.13 80)" : "transparent",
        color: pinned ? "oklch(0.95 0.1 80)" : tokens.muted,
        fontSize: 12,
        lineHeight: 1,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {pinned ? "★" : "☆"}
    </button>
  );
}

function MetaRow({ card }: { card: BriefCard }) {
  const identifiers = collectIdentifiers(card);
  const issueCount = uniqueIssueCount(card);
  const stamp = formatRelative(card.lastMeaningfulEventAt);
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 11, color: tokens.muted, minWidth: 0 }}>
      {identifiers.length > 0 ? (
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", color: tokens.fg }}>{identifiers[0]}</span>
      ) : null}
      {issueCount > 0 ? <span>{issueCount} {issueCount === 1 ? "issue" : "issues"}</span> : null}
      {stamp ? <span>Updated {stamp}</span> : null}
    </div>
  );
}

function SummarySlot({ card }: { card: BriefCard }) {
  if (card.snapshot.summaryStatus === "pending") {
    return (
      <div data-briefs-summary-pending style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ height: 10, background: "var(--secondary, oklch(0.27 0 0))", borderRadius: 4 }} />
        <span style={{ height: 10, width: "70%", background: "var(--secondary, oklch(0.27 0 0))", borderRadius: 4 }} />
      </div>
    );
  }
  const paragraphs = briefSummaryParagraphs(card);
  return (
    <div
      data-briefs-summary
      style={{ display: "grid", gap: 6, color: tokens.fg, fontSize: 13, lineHeight: 1.48 }}
    >
      {paragraphs.map((paragraph) => (
        <p key={paragraph} style={{ margin: 0 }}>{paragraph}</p>
      ))}
    </div>
  );
}

function briefSummaryParagraphs(card: BriefCard): string[] {
  const explicit = card.snapshot.summaryParagraph?.trim();
  if (!explicit) return ["Briefing Analyst has not generated this summary yet."];
  return explicit.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).slice(0, 2);
}

function SourceRows({ rows }: { rows: BriefTaskRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div data-briefs-source-rows style={{ margin: 0, padding: "2px 0 0", display: "flex", flexDirection: "column", borderTop: `1px solid ${tokens.border}` }}>
      {rows.map((row) => (
        row.kind === "issue" && (row.identifier || row.issueId) ? (
          <PluginIssueRow
            key={sourceRowKey(row)}
            issue={taskRowToIssue(row)}
            trailingMeta={formatRelative(row.eventAt)}
            className="!pl-0 !pr-0"
            disableIssueQuicklook={false}
          />
        ) : (
          <div
            key={`${row.kind}-${row.sourceId}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 0",
              borderBottom: `1px solid ${tokens.border}`,
              fontSize: 12,
              minWidth: 0,
            }}
          >
            <span aria-hidden style={{ color: tokens.muted, width: 14, textAlign: "center", flexShrink: 0 }}>{sourceKindIcon[row.kind] ?? "•"}</span>
            {row.identifier ? (
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", color: tokens.muted, fontSize: 11, flexShrink: 0 }}>{row.identifier}</span>
            ) : null}
            <SourceLink row={row} />
            <span style={{ color: tokens.muted, fontSize: 11, flexShrink: 0 }}>{formatRelative(row.eventAt)}</span>
          </div>
        )
      ))}
    </div>
  );
}

function SourceLink({ row }: { row: BriefTaskRow }) {
  const nav = useHostNavigation();
  const link = nav.linkProps(row.linkPath);
  const style: CSSProperties = {
    flex: 1,
    color: tokens.fg,
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };
  return (
    <a
      {...link}
      title={row.titleLine}
      style={style}
    >
      {row.titleLine}
    </a>
  );
}

function sourceRowKey(row: BriefTaskRow): string {
  return row.issueId || row.identifier || `${row.kind}:${row.sourceId}`;
}

function dedupeTaskRows(rows: BriefTaskRow[]): BriefTaskRow[] {
  const byKey = new Map<string, BriefTaskRow>();
  for (const row of rows) {
    const key = sourceRowKey(row);
    const current = byKey.get(key);
    if (!current || rowTime(row) > rowTime(current)) {
      byKey.set(key, row);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => rowTime(b) - rowTime(a));
}

function rowTime(row: BriefTaskRow): number {
  return Date.parse(row.eventAt) || 0;
}

function taskRowToIssue(row: BriefTaskRow): IssueRowIssue {
  return {
    id: row.issueId ?? row.identifier ?? row.sourceId,
    identifier: row.identifier,
    title: row.titleLine,
    status: statusFromRightTag(row.rightTag),
    updatedAt: row.eventAt,
    blockerAttention: row.rightTag === "blocked" && row.isIntraTreeBlocked === false,
  };
}

function statusFromRightTag(tag: string): IssueRowIssue["status"] {
  if (tag === "asked you") return "in_review";
  if (tag === "approval") return "in_review";
  if (tag === "running") return "in_progress";
  if (tag === "failed" || tag === "error" || tag === "recovery") return "blocked";
  if (tag === "paused") return "backlog";
  if (tag === "document" || tag === "comment") return "in_progress";
  return tag;
}

function collectIdentifiers(card: BriefCard): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const source of [...card.snapshot.taskRows, ...card.sources]) {
    if (source.identifier && !seen.has(source.identifier)) {
      seen.add(source.identifier);
      out.push(source.identifier);
    }
  }
  return out;
}

function uniqueIssueCount(card: BriefCard): number {
  const seen = new Set<string>();
  for (const source of card.sources) {
    if (source.sourceKind === "issue" && source.issueId) seen.add(source.issueId);
  }
  return seen.size;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      data-briefs-empty
      style={{
        padding: "40px 24px",
        border: `1px dashed ${tokens.border}`,
        borderRadius: 10,
        textAlign: "center",
        color: tokens.muted,
      }}
    >
      <div style={{ fontSize: 15, color: tokens.fg, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{body}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div data-briefs-loading style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))", gap: 12 }}>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} style={{ height: 160, borderRadius: 10, background: tokens.card, border: `1px solid ${tokens.border}`, padding: 14 }} aria-hidden>
          <div style={{ height: 10, width: "60%", background: "var(--secondary, oklch(0.27 0 0))", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 8, width: "90%", background: "var(--secondary, oklch(0.27 0 0))", borderRadius: 4, marginBottom: 4 }} />
          <div style={{ height: 8, width: "70%", background: "var(--secondary, oklch(0.27 0 0))", borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      data-briefs-error
      style={{
        padding: 16,
        border: `1px solid ${toneColors.red.accent}`,
        borderRadius: 10,
        background: "oklch(0.21 0.04 25 / 60%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: toneColors.red.badgeFg }}>Could not load briefing</div>
      <div style={{ fontSize: 12, color: tokens.muted }}>{message}</div>
      <div>
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${tokens.border}`,
            background: tokens.card,
            color: tokens.fg,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
