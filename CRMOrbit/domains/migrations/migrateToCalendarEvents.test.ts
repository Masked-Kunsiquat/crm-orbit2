import { describe, it, expect } from "@jest/globals";
import {
  migrateToCalendarEvents,
  migrateInteractionToCalendarEvent,
  migrateAuditToCalendarEvent,
  validateMigration,
} from "./migrateToCalendarEvents";
import { AutomergeDoc } from "../../automerge/schema";
import { Interaction } from "../interaction";
import { Audit } from "../audit";
import { generateEntityId } from "../shared/idGenerator";

// Helper to create a minimal AutomergeDoc
const createEmptyDoc = (): AutomergeDoc => ({
  organizations: {},
  accounts: {},
  audits: {},
  contacts: {},
  notes: {},
  interactions: {},
  codes: {},
  calendarEvents: {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: {} as any, // Simplified for testing
  relations: {
    accountContacts: {},
    accountCodes: {},
    entityLinks: {},
  },
});

// Helper to create a test Interaction
const createTestInteraction = (
  overrides: Partial<Interaction> = {},
): Interaction => ({
  id: generateEntityId(),
  type: "meeting",
  status: "completed",
  summary: "Test meeting",
  notes: "Meeting notes",
  scheduledFor: "2026-01-15T10:00:00.000Z",
  occurredAt: "2026-01-15T10:05:00.000Z",
  durationMinutes: 60,
  createdAt: "2026-01-14T12:00:00.000Z",
  updatedAt: "2026-01-14T12:00:00.000Z",
  ...overrides,
});

// Helper to create a test Audit
const createTestAudit = (overrides: Partial<Audit> = {}): Audit => ({
  id: generateEntityId(),
  accountId: generateEntityId(),
  status: "completed",
  summary: "Test audit",
  notes: "Audit notes",
  scheduledFor: "2026-01-15T14:00:00.000Z",
  occurredAt: "2026-01-15T14:30:00.000Z",
  score: 95,
  floorsVisited: [1, 2, 3],
  durationMinutes: 90,
  createdAt: "2026-01-14T12:00:00.000Z",
  updatedAt: "2026-01-14T12:00:00.000Z",
  ...overrides,
});

describe("migrateInteractionToCalendarEvent", () => {
  it("should migrate a completed interaction", () => {
    const interaction = createTestInteraction();
    const calendarEvent = migrateInteractionToCalendarEvent(interaction);

    expect(calendarEvent.id).toBe(interaction.id);
    expect(calendarEvent.type).toBe("meeting");
    expect(calendarEvent.status).toBe("completed");
    expect(calendarEvent.summary).toBe(interaction.summary);
    expect(calendarEvent.description).toBe(interaction.notes);
    expect(calendarEvent.scheduledFor).toBe(interaction.scheduledFor);
    expect(calendarEvent.occurredAt).toBe(interaction.occurredAt);
    expect(calendarEvent.durationMinutes).toBe(interaction.durationMinutes);
    expect(calendarEvent.auditData).toBeUndefined();
    expect(calendarEvent.recurrenceRule).toBeUndefined();
  });

  it("should migrate a scheduled interaction", () => {
    const interaction = createTestInteraction({
      status: "scheduled",
      occurredAt: undefined,
    });
    const calendarEvent = migrateInteractionToCalendarEvent(interaction);

    expect(calendarEvent.status).toBe("scheduled");
    expect(calendarEvent.occurredAt).toBeUndefined();
  });

  it("should migrate a canceled interaction", () => {
    const interaction = createTestInteraction({
      status: "canceled",
    });
    const calendarEvent = migrateInteractionToCalendarEvent(interaction);

    expect(calendarEvent.status).toBe("canceled");
  });

  it("should handle interaction with only occurredAt (no scheduledFor)", () => {
    const interaction = createTestInteraction({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scheduledFor: undefined as any,
      occurredAt: "2026-01-15T10:00:00.000Z",
    });
    const calendarEvent = migrateInteractionToCalendarEvent(interaction);

    expect(calendarEvent.scheduledFor).toBe(interaction.occurredAt);
  });

  it("should map interaction types correctly", () => {
    const types: Array<{ input: string; expected: string }> = [
      { input: "meeting", expected: "meeting" },
      { input: "call", expected: "call" },
      { input: "email", expected: "email" },
      { input: "interaction", expected: "other" },
      { input: "other", expected: "other" },
    ];

    types.forEach(({ input, expected }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const interaction = createTestInteraction({ type: input as any });
      const calendarEvent = migrateInteractionToCalendarEvent(interaction);
      expect(calendarEvent.type).toBe(expected);
    });
  });
});

describe("migrateAuditToCalendarEvent", () => {
  it("should migrate a completed audit", () => {
    const audit = createTestAudit();
    const calendarEvent = migrateAuditToCalendarEvent(audit);

    expect(calendarEvent.id).toBe(audit.id);
    expect(calendarEvent.type).toBe("audit");
    expect(calendarEvent.status).toBe("completed");
    expect(calendarEvent.scheduledFor).toBe(audit.scheduledFor);
    expect(calendarEvent.occurredAt).toBe(audit.occurredAt);
    expect(calendarEvent.durationMinutes).toBe(audit.durationMinutes);
    expect(calendarEvent.auditData).toEqual({
      accountId: audit.accountId,
      score: audit.score,
      floorsVisited: audit.floorsVisited,
    });
  });

  it("should migrate a scheduled audit", () => {
    const audit = createTestAudit({
      status: "scheduled",
      occurredAt: undefined,
      score: undefined,
      floorsVisited: undefined,
    });
    const calendarEvent = migrateAuditToCalendarEvent(audit);

    expect(calendarEvent.status).toBe("scheduled");
    expect(calendarEvent.occurredAt).toBeUndefined();
    expect(calendarEvent.auditData).toEqual({
      accountId: audit.accountId,
      score: undefined,
      floorsVisited: undefined,
    });
  });

  it("should migrate a canceled audit", () => {
    const audit = createTestAudit({
      status: "canceled",
    });
    const calendarEvent = migrateAuditToCalendarEvent(audit);

    expect(calendarEvent.status).toBe("canceled");
  });

  it("should use summary if provided, otherwise generate one", () => {
    const auditWithSummary = createTestAudit({ summary: "Monthly audit" });
    const calendarEvent1 = migrateAuditToCalendarEvent(auditWithSummary);
    expect(calendarEvent1.summary).toBe("Monthly audit");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditWithoutSummary = createTestAudit({ summary: undefined as any });
    const calendarEvent2 = migrateAuditToCalendarEvent(auditWithoutSummary);
    expect(calendarEvent2.summary).toContain("Audit for account");
  });
});

describe("migrateToCalendarEvents", () => {
  it("should migrate interactions to calendar events", () => {
    const doc = createEmptyDoc();
    const interaction1 = createTestInteraction();
    const interaction2 = createTestInteraction({ type: "call" });

    doc.interactions[interaction1.id] = interaction1;
    doc.interactions[interaction2.id] = interaction2;

    const result = migrateToCalendarEvents(doc);

    expect(result.success).toBe(true);
    expect(result.migratedInteractions).toBe(2);
    expect(result.migratedAudits).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.events).toHaveLength(2); // Should generate 2 events
    expect(doc.calendarEvents[interaction1.id]).toBeDefined();
    expect(doc.calendarEvents[interaction2.id]).toBeDefined();
  });

  it("should migrate audits to calendar events", () => {
    const doc = createEmptyDoc();
    const audit1 = createTestAudit();
    const audit2 = createTestAudit();

    doc.audits[audit1.id] = audit1;
    doc.audits[audit2.id] = audit2;

    const result = migrateToCalendarEvents(doc);

    expect(result.success).toBe(true);
    expect(result.migratedInteractions).toBe(0);
    expect(result.migratedAudits).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(result.events).toHaveLength(2); // Should generate 2 events
    expect(doc.calendarEvents[audit1.id]).toBeDefined();
    expect(doc.calendarEvents[audit2.id]).toBeDefined();
    expect(doc.calendarEvents[audit1.id].type).toBe("audit");
  });

  it("should migrate both interactions and audits", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();
    const audit = createTestAudit();

    doc.interactions[interaction.id] = interaction;
    doc.audits[audit.id] = audit;

    const result = migrateToCalendarEvents(doc);

    expect(result.success).toBe(true);
    expect(result.migratedInteractions).toBe(1);
    expect(result.migratedAudits).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(Object.keys(doc.calendarEvents)).toHaveLength(2);
  });

  it("should migrate entity links from interaction to calendarEvent", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();
    const accountId = generateEntityId();

    doc.interactions[interaction.id] = interaction;

    const linkId = generateEntityId();
    doc.relations.entityLinks[linkId] = {
      linkType: "interaction",
      interactionId: interaction.id,
      entityType: "account",
      entityId: accountId,
    };

    const result = migrateToCalendarEvents(doc);

    expect(result.success).toBe(true);
    expect(result.migratedLinks).toBe(1);

    const link = doc.relations.entityLinks[linkId];
    expect(link.linkType).toBe("calendarEvent");
    expect(link.calendarEventId).toBe(interaction.id);
    expect(link.interactionId).toBe(interaction.id); // Original preserved
  });

  it("should skip already migrated entities (idempotency)", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();

    doc.interactions[interaction.id] = interaction;
    doc.calendarEvents[interaction.id] =
      migrateInteractionToCalendarEvent(interaction);

    const result = migrateToCalendarEvents(doc);

    expect(result.success).toBe(true);
    expect(result.migratedInteractions).toBe(0); // Already migrated
    expect(result.errors).toHaveLength(0);
  });

  it("should handle empty document", () => {
    const doc = createEmptyDoc();
    const result = migrateToCalendarEvents(doc);

    expect(result.success).toBe(true);
    expect(result.migratedInteractions).toBe(0);
    expect(result.migratedAudits).toBe(0);
    expect(result.migratedLinks).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("should continue migrating even if one entity fails", () => {
    const doc = createEmptyDoc();
    const goodInteraction = createTestInteraction();
    const badInteraction = createTestInteraction({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: null as any, // Will cause error
    });

    doc.interactions[goodInteraction.id] = goodInteraction;
    doc.interactions["bad-id"] = badInteraction;

    const result = migrateToCalendarEvents(doc);

    expect(result.success).toBe(true);
    expect(result.migratedInteractions).toBeGreaterThan(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateMigration", () => {
  it("should pass validation when all entities are migrated", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();
    const audit = createTestAudit();

    doc.interactions[interaction.id] = interaction;
    doc.audits[audit.id] = audit;
    doc.calendarEvents[interaction.id] =
      migrateInteractionToCalendarEvent(interaction);
    doc.calendarEvents[audit.id] = migrateAuditToCalendarEvent(audit);

    const result = validateMigration(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("should fail validation when interactions are not migrated", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();

    doc.interactions[interaction.id] = interaction;
    // Not migrated

    const result = validateMigration(doc);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain("unmigrated interactions");
  });

  it("should fail validation when audits are not migrated", () => {
    const doc = createEmptyDoc();
    const audit = createTestAudit();

    doc.audits[audit.id] = audit;
    // Not migrated

    const result = validateMigration(doc);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain("unmigrated audits");
  });

  it("should fail validation when entity links are not migrated", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();

    doc.interactions[interaction.id] = interaction;
    doc.calendarEvents[interaction.id] =
      migrateInteractionToCalendarEvent(interaction);

    const linkId = generateEntityId();
    doc.relations.entityLinks[linkId] = {
      linkType: "interaction",
      interactionId: interaction.id,
      entityType: "account",
      entityId: generateEntityId(),
      // calendarEventId not set - should fail validation
    };

    const result = validateMigration(doc);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain("unmigrated interaction links");
  });

  it("should detect orphaned calendar event links", () => {
    const doc = createEmptyDoc();

    const linkId = generateEntityId();
    doc.relations.entityLinks[linkId] = {
      linkType: "calendarEvent",
      calendarEventId: "non-existent-id",
      entityType: "account",
      entityId: generateEntityId(),
    };

    const result = validateMigration(doc);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain("orphaned");
  });

  it("should pass validation for empty document", () => {
    const doc = createEmptyDoc();
    const result = validateMigration(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("should pass validation when legacy interactions exist but calendar events also exist", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();

    // Both old and new exist (backward compatibility phase)
    doc.interactions[interaction.id] = interaction;
    doc.calendarEvents[interaction.id] =
      migrateInteractionToCalendarEvent(interaction);

    const result = validateMigration(doc);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe("Migration Idempotency", () => {
  it("should be safe to run migration multiple times", () => {
    const doc = createEmptyDoc();
    const interaction = createTestInteraction();
    const audit = createTestAudit();

    doc.interactions[interaction.id] = interaction;
    doc.audits[audit.id] = audit;

    // Run migration first time
    const result1 = migrateToCalendarEvents(doc);
    expect(result1.migratedInteractions).toBe(1);
    expect(result1.migratedAudits).toBe(1);

    // Run migration second time
    const result2 = migrateToCalendarEvents(doc);
    expect(result2.migratedInteractions).toBe(0); // Already migrated
    expect(result2.migratedAudits).toBe(0); // Already migrated

    // Should still have exactly 2 calendar events
    expect(Object.keys(doc.calendarEvents)).toHaveLength(2);
  });
});
