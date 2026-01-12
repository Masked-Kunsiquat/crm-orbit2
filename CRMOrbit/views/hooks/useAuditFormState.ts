import { useCallback, useEffect, useState } from "react";
import type { Audit, AuditStatus } from "@domains/audit";
import { formatAuditScoreInput } from "@views/utils/audits";
import { splitDurationMinutes } from "@views/utils/duration";

export type DurationPreset = "30" | "60" | "120" | "240" | "custom";

export const DURATION_PRESETS: DurationPreset[] = ["30", "60", "120", "240"];

export type AuditFormState = {
  // Account selection
  accountId: string;
  setAccountId: (id: string) => void;
  isAccountPickerOpen: boolean;
  setIsAccountPickerOpen: (open: boolean) => void;

  // Date/time fields
  scheduledFor: string;
  setScheduledFor: (timestamp: string) => void;
  occurredAt: string;
  setOccurredAt: (timestamp: string) => void;
  activePicker: "scheduled" | "occurred" | null;
  setActivePicker: (picker: "scheduled" | "occurred" | null) => void;

  // Form fields
  notes: string;
  setNotes: (notes: string) => void;
  score: string;
  setScore: (score: string) => void;
  floorsVisitedInput: string;
  setFloorsVisitedInput: (input: string) => void;
  status: AuditStatus;
  setStatus: (status: AuditStatus) => void;

  // Duration fields
  durationPreset: DurationPreset;
  setDurationPreset: (preset: DurationPreset) => void;
  durationHours: string;
  setDurationHours: (hours: string) => void;
  durationMinutesInput: string;
  setDurationMinutesInput: (minutes: string) => void;

  // Helper methods
  getResolvedDate: (field: "scheduled" | "occurred") => Date;
  updateTimestamp: (field: "scheduled" | "occurred", date: Date) => void;
};

export type UseAuditFormStateParams = {
  audit?: Audit;
  prefillAccountId?: string;
};

/**
 * Manages audit form state including dates, duration, and form fields.
 * Handles initialization from existing audit or prefill data.
 */
export const useAuditFormState = ({
  audit,
  prefillAccountId,
}: UseAuditFormStateParams): AuditFormState => {
  const [accountId, setAccountId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  const [floorsVisitedInput, setFloorsVisitedInput] = useState("");
  const [status, setStatus] = useState<AuditStatus>("audits.status.scheduled");
  const [durationPreset, setDurationPreset] =
    useState<DurationPreset>("custom");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutesInput, setDurationMinutesInput] = useState("");
  const [activePicker, setActivePicker] = useState<
    "scheduled" | "occurred" | null
  >(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);

  // Initialize form state from audit or prefill data
  useEffect(() => {
    if (audit) {
      setAccountId(audit.accountId);
      setScheduledFor(audit.scheduledFor);
      setOccurredAt(audit.occurredAt ?? "");
      setStatus(
        audit.status ??
          (audit.occurredAt
            ? "audits.status.completed"
            : "audits.status.scheduled"),
      );
      setNotes(audit.notes ?? "");
      setScore(formatAuditScoreInput(audit.score));
      setFloorsVisitedInput(audit.floorsVisited?.join(", ") ?? "");
      const { hours, minutes } = splitDurationMinutes(audit.durationMinutes);
      setDurationHours(hours ? `${hours}` : "");
      setDurationMinutesInput(minutes ? `${minutes}` : "");
      const preset = DURATION_PRESETS.find(
        (value) => Number(value) === audit.durationMinutes,
      );
      setDurationPreset(preset ?? "custom");
      return;
    }

    const now = new Date().toISOString();
    setAccountId(prefillAccountId ?? "");
    setScheduledFor(now);
    setOccurredAt("");
    setStatus("audits.status.scheduled");
    setNotes("");
    setScore("");
    setFloorsVisitedInput("");
    setDurationPreset("custom");
    setDurationHours("");
    setDurationMinutesInput("");
  }, [audit, prefillAccountId]);

  const getResolvedDate = useCallback(
    (field: "scheduled" | "occurred") => {
      const timestamp = field === "scheduled" ? scheduledFor : occurredAt;
      const date = new Date(timestamp || new Date().toISOString());
      if (Number.isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    },
    [occurredAt, scheduledFor],
  );

  const updateTimestamp = useCallback(
    (field: "scheduled" | "occurred", date: Date) => {
      const nextTimestamp = date.toISOString();
      if (field === "scheduled") {
        setScheduledFor(nextTimestamp);
      } else {
        setOccurredAt(nextTimestamp);
      }
    },
    [],
  );

  return {
    accountId,
    setAccountId,
    isAccountPickerOpen,
    setIsAccountPickerOpen,
    scheduledFor,
    setScheduledFor,
    occurredAt,
    setOccurredAt,
    activePicker,
    setActivePicker,
    notes,
    setNotes,
    score,
    setScore,
    floorsVisitedInput,
    setFloorsVisitedInput,
    status,
    setStatus,
    durationPreset,
    setDurationPreset,
    durationHours,
    setDurationHours,
    durationMinutesInput,
    setDurationMinutesInput,
    getResolvedDate,
    updateTimestamp,
  };
};
