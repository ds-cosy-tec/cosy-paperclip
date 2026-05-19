export const RECOVERY_MODEL_PROFILE_KEY = "cheap" as const;

export type RecoveryModelProfileWorkClass = "status_only" | "normal_model";

export const STATUS_ONLY_RECOVERY_GUARD_CONTEXT = {
  recoveryIntent: "status_only",
  allowDeliverableWork: false,
  allowDocumentUpdates: false,
  resumeRequiresNormalModel: true,
} as const;

const RECOVERY_MODEL_PROFILE_HINT_KEYS = [
  "modelProfile",
  "paperclipModelProfile",
  "recoveryIntent",
  "allowDeliverableWork",
  "allowDocumentUpdates",
  "resumeRequiresNormalModel",
] as const;

export function scrubRecoveryModelProfileHints<T extends Record<string, unknown>>(
  input: T,
): T {
  const output: Record<string, unknown> = { ...input };
  for (const key of RECOVERY_MODEL_PROFILE_HINT_KEYS) {
    delete output[key];
  }
  return output as T;
}

export function withRecoveryModelProfileHint<T extends Record<string, unknown>>(
  input: T,
  workClass: RecoveryModelProfileWorkClass,
): T & Partial<typeof STATUS_ONLY_RECOVERY_GUARD_CONTEXT> & { modelProfile?: typeof RECOVERY_MODEL_PROFILE_KEY } {
  if (workClass === "normal_model") {
    return scrubRecoveryModelProfileHints(input);
  }

  return {
    ...scrubRecoveryModelProfileHints(input),
    ...STATUS_ONLY_RECOVERY_GUARD_CONTEXT,
    modelProfile: RECOVERY_MODEL_PROFILE_KEY,
  };
}

export function recoveryAssigneeAdapterOverrides(workClass: Extract<RecoveryModelProfileWorkClass, "status_only">) {
  void workClass;
  return { modelProfile: RECOVERY_MODEL_PROFILE_KEY };
}
