import { useCallback, useEffect, useState } from "react";
import type { CalendarEvent } from "@domains/calendarEvent";
import {
  formatAuditScoreInput,
  resolveAuditStatus,
  getAuditAccountId,
  getAuditNotes,
  getAuditScore,
  getAuditFloorsVisited,
  type AuditStatus,
} from "@views/utils/audits";
import { splitDurationMinutes } from "@views/utils/duration";
import { buildTimestampFromDate } from "@views/utils/date";

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
  audit?: CalendarEvent;
  prefillAccountId?: string;
  prefillDate?: string;
};

/**
 * Manages audit form state including dates, duration, and form fields.
 * Handles initialization from existing audit or prefill data.
 */
export const useAuditFormState = ({
  audit,
  prefillAccountId,
  prefillDate,
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
      setAccountId(getAuditAccountId(audit) ?? "");
      setScheduledFor(audit.scheduledFor);
      setOccurredAt(audit.occurredAt ?? "");
      setStatus(resolveAuditStatus(audit));
      setNotes(getAuditNotes(audit) ?? "");
      setScore(formatAuditScoreInput(getAuditScore(audit)));
      setFloorsVisitedInput(getAuditFloorsVisited(audit)?.join(", ") ?? "");
      const { hours, minutes } = splitDurationMinutes(
        audit.durationMinutes ?? 60,
      );
      setDurationHours(hours ? `${hours}` : "");
      setDurationMinutesInput(minutes ? `${minutes}` : "");
      const preset = DURATION_PRESETS.find(
        (value) => Number(value) === audit.durationMinutes,
      );
      setDurationPreset(preset ?? "custom");
      return;
    }

    setAccountId(prefillAccountId ?? "");
    setOccurredAt("");
    setStatus("audits.status.scheduled");
    setNotes("");
    setScore("");
    setFloorsVisitedInput("");
    setDurationPreset("custom");
    setDurationHours("");
    setDurationMinutesInput("");
    const baseTimestamp = buildTimestampFromDate(prefillDate);
    setScheduledFor(baseTimestamp);
  }, [audit, prefillAccountId, prefillDate]);

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
