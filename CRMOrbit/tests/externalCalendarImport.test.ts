import assert from "node:assert/strict";

import type { Account } from "@domains/account";
import type { CalendarEvent } from "@domains/calendarEvent";
import {
  appendCrmOrbitMarkerToNotes,
  buildCrmOrbitMarker,
  buildExternalCalendarImportCandidates,
  buildExternalCalendarImportWindow,
  buildExternalEventNotes,
  replaceCrmOrbitMarkerInNotes,
  stripCrmOrbitMetadataFromNotes,
} from "@views/utils/externalCalendarImport";

const createAccount = (
  id: string,
  name: string,
  aliases?: string[],
): Account => ({
  id,
  organizationId: "org-1",
  name,
  status: "account.status.active",
  auditFrequency: "account.auditFrequency.monthly",
  auditFrequencyUpdatedAt: "2026-01-01T00:00:00.000Z",
  auditFrequencyAnchorAt: "2026-01-01T00:00:00.000Z",
  calendarMatch: aliases
    ? {
        mode: "exact",
        aliases,
      }
    : undefined,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const createCalendarEvent = (
  id: string,
  summary: string,
  accountId: string,
): CalendarEvent => ({
  id,
  type: "calendarEvent.type.audit",
  status: "calendarEvent.status.completed",
  summary,
  scheduledFor: "2026-01-05T10:00:00.000Z",
  occurredAt: "2026-01-05T10:00:00.000Z",
  auditData: {
    accountId,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("buildExternalCalendarImportWindow uses a 60/180 day scan range", () => {
  const now = new Date("2026-01-15T00:00:00.000Z");
  const window = buildExternalCalendarImportWindow(now);

  const expectedStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const expectedEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  assert.equal(window.start.toISOString(), expectedStart.toISOString());
  assert.equal(window.end.toISOString(), expectedEnd.toISOString());
});

test("buildExternalCalendarImportCandidates filters linked events", () => {
  const accounts = [createAccount("acct-1", "Comcast Center")];
  const externalEvents = [
    {
      externalEventId: "ext-1",
      calendarId: "cal-1",
      title: "Comcast Center",
      startDate: new Date("2026-01-10T12:00:00.000Z"),
      endDate: new Date("2026-01-10T13:00:00.000Z"),
    },
    {
      externalEventId: "ext-2",
      calendarId: "cal-1",
      title: "Comcast Center",
      startDate: new Date("2026-01-11T12:00:00.000Z"),
      endDate: new Date("2026-01-11T13:00:00.000Z"),
    },
  ];

  const candidates = buildExternalCalendarImportCandidates(
    externalEvents,
    accounts,
    [],
    new Set(["ext-2"]),
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.externalEventId, "ext-1");
});

test("buildExternalCalendarImportCandidates infers suggested account", () => {
  const primary = createAccount("acct-1", "Comcast Center");
  const fallback = createAccount("acct-2", "Other", ["Comcast Center"]);
  const externalEvents = [
    {
      externalEventId: "ext-3",
      calendarId: "cal-1",
      title: "Comcast Center",
      startDate: new Date("2026-01-12T12:00:00.000Z"),
      endDate: new Date("2026-01-12T13:00:00.000Z"),
    },
  ];
  const calendarEvents = [
    createCalendarEvent("cal-evt-1", "Comcast Center", "acct-2"),
  ];

  const candidates = buildExternalCalendarImportCandidates(
    externalEvents,
    [primary, fallback],
    calendarEvents,
    new Set(),
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.matchedAccountIds.length, 2);
  assert.equal(candidates[0]?.suggestedAccountId, "acct-2");
});

test("notes helpers strip and reapply CRM Orbit metadata", () => {
  const marker = buildCrmOrbitMarker("calendar-1");
  const notes = `Summary\n${marker}\ncrmOrbitAudit:{"score":95}`;

  assert.equal(stripCrmOrbitMetadataFromNotes(notes), "Summary");
  assert.equal(appendCrmOrbitMarkerToNotes("", "calendar-1"), marker);

  const replaced = replaceCrmOrbitMarkerInNotes(notes, "calendar-2");
  assert.equal(replaced, `Summary\n${buildCrmOrbitMarker("calendar-2")}`);
});

test("buildExternalEventNotes appends audit metadata for completed audits", () => {
  const calendarEvent: CalendarEvent = {
    id: "calendar-3",
    type: "calendarEvent.type.audit",
    status: "calendarEvent.status.completed",
    summary: "Comcast Center",
    scheduledFor: "2026-01-05T10:00:00.000Z",
    occurredAt: "2026-01-05T10:00:00.000Z",
    auditData: {
      accountId: "acct-3",
      score: 92,
      floorsVisited: [1, 2],
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const notes = buildExternalEventNotes("Summary", calendarEvent);

  assert.ok(notes.includes(buildCrmOrbitMarker("calendar-3")));
  assert.ok(notes.includes("crmOrbitAudit:"));
  assert.ok(notes.startsWith("Summary"));
});
