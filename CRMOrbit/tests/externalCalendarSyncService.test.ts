import assert from "node:assert/strict";

import * as Calendar from "expo-calendar";
import { beforeAll, afterAll } from "@jest/globals";
import type { CalendarEvent } from "@domains/calendarEvent";
import type { CalendarEventExternalLinkRecord } from "@domains/persistence/calendarEventExternalLinks";
import {
  deleteCalendarEventExternalLink,
  listExternalLinksForCalendar,
  updateCalendarEventExternalLinkSyncState,
} from "@domains/persistence/calendarEventExternalLinks";
import { silenceLogs, unsilenceLogs } from "@utils/logger";
import { syncExternalCalendarLinks } from "@views/services/externalCalendarSyncService";

jest.mock("expo-calendar", () => ({
  __esModule: true,
  EventStatus: {
    CONFIRMED: "confirmed",
    CANCELED: "canceled",
  },
  getEventAsync: jest.fn(),
  updateEventAsync: jest.fn(),
}));

jest.mock("@domains/persistence/database", () => ({
  getDatabase: jest.fn(() => ({})),
}));

jest.mock("@domains/persistence/calendarEventExternalLinks", () => ({
  deleteCalendarEventExternalLink: jest.fn(),
  listExternalLinksForCalendar: jest.fn(),
  updateCalendarEventExternalLinkSyncState: jest.fn(),
}));

const mockedCalendar = Calendar as unknown as {
  getEventAsync: jest.Mock;
  updateEventAsync: jest.Mock;
  EventStatus: { CONFIRMED: string; CANCELED: string };
};

const buildCalendarEvent = (
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent => ({
  id: "calendar-1",
  type: "calendarEvent.type.meeting",
  status: "calendarEvent.status.scheduled",
  summary: "Quarterly review",
  scheduledFor: "2026-01-10T10:00:00.000Z",
  durationMinutes: 60,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const buildLink = (
  overrides: Partial<CalendarEventExternalLinkRecord> = {},
): CalendarEventExternalLinkRecord => ({
  id: "link-1",
  calendarEventId: "calendar-1",
  provider: "expo-calendar",
  calendarId: "calendar-1",
  externalEventId: "ext-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastSyncedAt: "2026-01-01T00:00:00.000Z",
  lastExternalModifiedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

beforeAll(() => {
  silenceLogs();
});

afterAll(() => {
  unsilenceLogs();
});

test("syncExternalCalendarLinks emits external-to-crm changes", async () => {
  const link = buildLink();
  (listExternalLinksForCalendar as jest.Mock).mockResolvedValue([link]);
  mockedCalendar.getEventAsync.mockResolvedValue({
    id: link.externalEventId,
    calendarId: link.calendarId,
    title: "Quarterly review",
    notes: "notes",
    status: mockedCalendar.EventStatus.CANCELED,
    startDate: new Date("2026-01-10T10:00:00.000Z"),
    endDate: new Date("2026-01-10T11:00:00.000Z"),
    lastModifiedDate: new Date("2026-01-02T00:00:00.000Z"),
    creationDate: new Date("2026-01-01T00:00:00.000Z"),
  });

  const calendarEvent = buildCalendarEvent();
  const result = await syncExternalCalendarLinks({
    calendarId: link.calendarId,
    calendarEvents: [calendarEvent],
    deviceId: "device-1",
  });

  assert.equal(result.summary.externalToCrm, 1);
  assert.equal(result.summary.crmToExternal, 0);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0]?.type, "calendarEvent.canceled");
  expect(updateCalendarEventExternalLinkSyncState).toHaveBeenCalledWith(
    {},
    link.id,
    expect.objectContaining({ lastSyncedAt: expect.any(String) }),
  );
});

test("syncExternalCalendarLinks updates external event when CRM changed", async () => {
  const link = buildLink({
    lastSyncedAt: "2026-01-01T00:00:00.000Z",
    lastExternalModifiedAt: "2026-01-01T00:00:00.000Z",
  });
  (listExternalLinksForCalendar as jest.Mock).mockResolvedValue([link]);
  mockedCalendar.getEventAsync.mockResolvedValue({
    id: link.externalEventId,
    calendarId: link.calendarId,
    title: "Old title",
    notes: "",
    status: mockedCalendar.EventStatus.CONFIRMED,
    startDate: new Date("2026-01-10T10:00:00.000Z"),
    endDate: new Date("2026-01-10T11:00:00.000Z"),
    lastModifiedDate: new Date("2026-01-01T00:00:00.000Z"),
    creationDate: new Date("2026-01-01T00:00:00.000Z"),
  });

  const calendarEvent = buildCalendarEvent({
    summary: "Quarterly review",
    updatedAt: "2026-01-02T00:00:00.000Z",
  });

  const result = await syncExternalCalendarLinks({
    calendarId: link.calendarId,
    calendarEvents: [calendarEvent],
    deviceId: "device-1",
  });

  assert.equal(result.summary.crmToExternal, 1);
  assert.equal(result.changes.length, 0);
  expect(mockedCalendar.updateEventAsync).toHaveBeenCalledWith(
    link.externalEventId,
    expect.objectContaining({ title: "Quarterly review" }),
  );
});

test("syncExternalCalendarLinks prunes missing calendar events", async () => {
  const link = buildLink();
  (listExternalLinksForCalendar as jest.Mock).mockResolvedValue([link]);

  const result = await syncExternalCalendarLinks({
    calendarId: link.calendarId,
    calendarEvents: [],
    deviceId: "device-1",
  });

  assert.equal(result.summary.errors, 1);
  expect(deleteCalendarEventExternalLink).toHaveBeenCalledWith({}, link.id);
});

test("syncExternalCalendarLinks prunes missing external events", async () => {
  const link = buildLink();
  (listExternalLinksForCalendar as jest.Mock).mockResolvedValue([link]);
  mockedCalendar.getEventAsync.mockResolvedValue(null);

  const result = await syncExternalCalendarLinks({
    calendarId: link.calendarId,
    calendarEvents: [buildCalendarEvent()],
    deviceId: "device-1",
  });

  assert.equal(result.summary.errors, 1);
  expect(deleteCalendarEventExternalLink).toHaveBeenCalledWith({}, link.id);
});
