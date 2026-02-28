/**
 * Dummy data for screenshots and demos.
 *
 * Scenario: "Orbit Facilities Management" — a facilities/property-services
 * company that manages audits and contacts across several commercial buildings.
 *
 * The sentinel org ID is used to detect whether dummy data is currently loaded.
 */

import type { AutomergeDoc } from "@automerge/schema";
import type { Organization } from "@domains/organization";
import type { Account } from "@domains/account";
import type { Contact } from "@domains/contact";
import type { Note } from "@domains/note";
import type { Code } from "@domains/code";
import type { CalendarEvent } from "@domains/calendarEvent";
import type { AccountContact } from "@domains/relations/accountContact";
import type { AccountCode } from "@domains/relations/accountCode";
import type { EntityLink } from "@domains/relations/entityLink";
import { DEFAULT_SETTINGS } from "@domains/settings";

// ---------------------------------------------------------------------------
// Sentinel — used to detect whether dummy data is active
// ---------------------------------------------------------------------------

export const DUMMY_ORG_ID = "org-00000000-0000-4000-a000-000000000001";

// ---------------------------------------------------------------------------
// IDs (stable so the dataset is reproducible across devices)
// ---------------------------------------------------------------------------

const ACCOUNT_MERIDIAN = "account-00000000-0000-4000-a000-000000000001";
const ACCOUNT_HARBOR = "account-00000000-0000-4000-a000-000000000002";
const ACCOUNT_SUMMIT = "account-00000000-0000-4000-a000-000000000003";
const ACCOUNT_WESTFIELD = "account-00000000-0000-4000-a000-000000000004";

const CONTACT_SARAH = "contact-00000000-0000-4000-a000-000000000001";
const CONTACT_JAMES = "contact-00000000-0000-4000-a000-000000000002";
const CONTACT_PRIYA = "contact-00000000-0000-4000-a000-000000000003";
const CONTACT_TOM = "contact-00000000-0000-4000-a000-000000000004";
const CONTACT_LINDA = "contact-00000000-0000-4000-a000-000000000005";
const CONTACT_MARCO = "contact-00000000-0000-4000-a000-000000000006";

const NOTE_1 = "note-00000000-0000-4000-a000-000000000001";
const NOTE_2 = "note-00000000-0000-4000-a000-000000000002";
const NOTE_3 = "note-00000000-0000-4000-a000-000000000003";
const NOTE_4 = "note-00000000-0000-4000-a000-000000000004";

const CODE_MERIDIAN_DOOR = "code-00000000-0000-4000-a000-000000000001";
const CODE_MERIDIAN_ALARM = "code-00000000-0000-4000-a000-000000000002";
const CODE_HARBOR_GATE = "code-00000000-0000-4000-a000-000000000003";
const CODE_SUMMIT_LOCKBOX = "code-00000000-0000-4000-a000-000000000004";

const EVT_AUDIT_MERIDIAN_DONE = "evt-00000000-0000-4000-a000-000000000001";
const EVT_AUDIT_HARBOR_SCHED = "evt-00000000-0000-4000-a000-000000000002";
const EVT_AUDIT_SUMMIT_DONE = "evt-00000000-0000-4000-a000-000000000003";
const EVT_MEETING_MERIDIAN = "evt-00000000-0000-4000-a000-000000000004";
const EVT_CALL_HARBOR = "evt-00000000-0000-4000-a000-000000000005";
const EVT_AUDIT_WESTFIELD_CANCELED = "evt-00000000-0000-4000-a000-000000000006";
const EVT_MEETING_SUMMIT = "evt-00000000-0000-4000-a000-000000000007";

const AC_SARAH_MERIDIAN = "ac-00000000-0000-4000-a000-000000000001";
const AC_JAMES_MERIDIAN = "ac-00000000-0000-4000-a000-000000000002";
const AC_PRIYA_HARBOR = "ac-00000000-0000-4000-a000-000000000003";
const AC_MARCO_HARBOR = "ac-00000000-0000-4000-a000-000000000004";
const AC_TOM_SUMMIT = "ac-00000000-0000-4000-a000-000000000005";
const AC_LINDA_WESTFIELD = "ac-00000000-0000-4000-a000-000000000006";
const AC_SARAH_WESTFIELD = "ac-00000000-0000-4000-a000-000000000007";

const ACODE_MERIDIAN_DOOR = "acode-00000000-0000-4000-a000-000000000001";
const ACODE_MERIDIAN_ALARM = "acode-00000000-0000-4000-a000-000000000002";
const ACODE_HARBOR_GATE = "acode-00000000-0000-4000-a000-000000000003";
const ACODE_SUMMIT_LOCKBOX = "acode-00000000-0000-4000-a000-000000000004";

const LINK_NOTE1_MERIDIAN = "link-00000000-0000-4000-a000-000000000001";
const LINK_NOTE2_HARBOR = "link-00000000-0000-4000-a000-000000000002";
const LINK_NOTE3_SUMMIT = "link-00000000-0000-4000-a000-000000000003";
const LINK_NOTE4_EVT1 = "link-00000000-0000-4000-a000-000000000004";

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

const org: Organization = {
  id: DUMMY_ORG_ID,
  name: "Orbit Facilities Management",
  status: "organization.status.active",
  activeAt: "2023-01-15T08:00:00.000Z",
  website: "https://orbitfacilities.example.com",
  socialMedia: {
    linkedin: "https://linkedin.com/company/orbit-facilities",
  },
  createdAt: "2023-01-15T08:00:00.000Z",
  updatedAt: "2024-06-01T10:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

const accountMeridian: Account = {
  id: ACCOUNT_MERIDIAN,
  organizationId: DUMMY_ORG_ID,
  name: "Meridian Tower",
  status: "account.status.active",
  activeAt: "2023-02-01T09:00:00.000Z",
  auditFrequency: "account.auditFrequency.monthly",
  auditFrequencyUpdatedAt: "2023-02-01T09:00:00.000Z",
  auditFrequencyAnchorAt: "2023-02-01T00:00:00.000Z",
  addresses: {
    site: {
      street: "1200 Meridian Ave",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
    },
    parking: {
      street: "1205 Meridian Ave",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
    },
    useSameForParking: false,
  },
  minFloor: 1,
  maxFloor: 32,
  excludedFloors: [13],
  website: "https://meridiantower.example.com",
  calendarMatch: {
    mode: "exact",
    aliases: ["Meridian Tower", "Meridian Bldg"],
  },
  createdAt: "2023-02-01T09:00:00.000Z",
  updatedAt: "2025-11-10T14:22:00.000Z",
};

const accountHarbor: Account = {
  id: ACCOUNT_HARBOR,
  organizationId: DUMMY_ORG_ID,
  name: "Harbor View Plaza",
  status: "account.status.active",
  activeAt: "2023-03-15T09:00:00.000Z",
  auditFrequency: "account.auditFrequency.quarterly",
  auditFrequencyUpdatedAt: "2023-03-15T09:00:00.000Z",
  auditFrequencyAnchorAt: "2023-03-01T00:00:00.000Z",
  addresses: {
    site: {
      street: "400 Harbor Blvd",
      city: "Seattle",
      state: "WA",
      zipCode: "98104",
    },
    useSameForParking: true,
  },
  minFloor: 1,
  maxFloor: 18,
  website: "https://harborviewplaza.example.com",
  createdAt: "2023-03-15T09:00:00.000Z",
  updatedAt: "2025-10-28T09:45:00.000Z",
};

const accountSummit: Account = {
  id: ACCOUNT_SUMMIT,
  organizationId: DUMMY_ORG_ID,
  name: "Summit Office Park",
  status: "account.status.active",
  activeAt: "2023-05-01T09:00:00.000Z",
  auditFrequency: "account.auditFrequency.bimonthly",
  auditFrequencyUpdatedAt: "2023-05-01T09:00:00.000Z",
  auditFrequencyAnchorAt: "2023-05-01T00:00:00.000Z",
  addresses: {
    site: {
      street: "8800 Summit Pkwy",
      city: "Bellevue",
      state: "WA",
      zipCode: "98004",
    },
    useSameForParking: true,
  },
  minFloor: 1,
  maxFloor: 8,
  createdAt: "2023-05-01T09:00:00.000Z",
  updatedAt: "2025-09-15T11:00:00.000Z",
};

const accountWestfield: Account = {
  id: ACCOUNT_WESTFIELD,
  organizationId: DUMMY_ORG_ID,
  name: "Westfield Corporate Center",
  status: "account.status.inactive",
  activeAt: "2022-09-01T09:00:00.000Z",
  inactiveAt: "2025-08-31T17:00:00.000Z",
  auditFrequency: "account.auditFrequency.quarterly",
  auditFrequencyUpdatedAt: "2022-09-01T09:00:00.000Z",
  auditFrequencyAnchorAt: "2022-09-01T00:00:00.000Z",
  addresses: {
    site: {
      street: "300 Westfield Dr",
      city: "Redmond",
      state: "WA",
      zipCode: "98052",
    },
    useSameForParking: true,
  },
  minFloor: 1,
  maxFloor: 12,
  createdAt: "2022-09-01T09:00:00.000Z",
  updatedAt: "2025-08-31T17:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const contactSarah: Contact = {
  id: CONTACT_SARAH,
  type: "contact.type.internal",
  firstName: "Sarah",
  lastName: "Chen",
  title: "Senior Facilities Auditor",
  methods: {
    emails: [
      {
        id: "cm-sarah-email-1",
        value: "s.chen@orbitfacilities.example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
    phones: [
      {
        id: "cm-sarah-phone-1",
        value: "+12065550101",
        label: "contact.method.label.mobile",
        status: "contact.method.status.active",
      },
    ],
  },
  createdAt: "2023-01-20T10:00:00.000Z",
  updatedAt: "2024-03-01T09:00:00.000Z",
};

const contactJames: Contact = {
  id: CONTACT_JAMES,
  type: "contact.type.external",
  firstName: "James",
  lastName: "Hartwell",
  title: "Property Manager",
  methods: {
    emails: [
      {
        id: "cm-james-email-1",
        value: "j.hartwell@meridiantower.example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
    phones: [
      {
        id: "cm-james-phone-1",
        value: "+12065550202",
        extension: "204",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
      {
        id: "cm-james-phone-2",
        value: "+12065550203",
        label: "contact.method.label.mobile",
        status: "contact.method.status.active",
      },
    ],
  },
  createdAt: "2023-02-05T11:00:00.000Z",
  updatedAt: "2024-01-15T10:00:00.000Z",
};

const contactPriya: Contact = {
  id: CONTACT_PRIYA,
  type: "contact.type.external",
  firstName: "Priya",
  lastName: "Nair",
  title: "Building Operations Lead",
  methods: {
    emails: [
      {
        id: "cm-priya-email-1",
        value: "priya.nair@harborview.example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
    phones: [
      {
        id: "cm-priya-phone-1",
        value: "+12065550304",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
  },
  createdAt: "2023-03-20T09:30:00.000Z",
  updatedAt: "2024-05-10T08:00:00.000Z",
};

const contactTom: Contact = {
  id: CONTACT_TOM,
  type: "contact.type.external",
  firstName: "Tom",
  lastName: "Reyes",
  title: "Facilities Director",
  methods: {
    emails: [
      {
        id: "cm-tom-email-1",
        value: "t.reyes@summitofficepark.example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
    phones: [
      {
        id: "cm-tom-phone-1",
        value: "+14255550405",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
      {
        id: "cm-tom-phone-2",
        value: "+14255550406",
        label: "contact.method.label.personal",
        status: "contact.method.status.inactive",
      },
    ],
  },
  createdAt: "2023-05-10T10:00:00.000Z",
  updatedAt: "2025-01-08T13:00:00.000Z",
};

const contactLinda: Contact = {
  id: CONTACT_LINDA,
  type: "contact.type.external",
  firstName: "Linda",
  lastName: "Okonkwo",
  title: "VP of Real Estate",
  methods: {
    emails: [
      {
        id: "cm-linda-email-1",
        value: "l.okonkwo@westfieldcorp.example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
    phones: [
      {
        id: "cm-linda-phone-1",
        value: "+14255550507",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
  },
  createdAt: "2022-09-05T09:00:00.000Z",
  updatedAt: "2025-08-28T16:00:00.000Z",
};

const contactMarco: Contact = {
  id: CONTACT_MARCO,
  type: "contact.type.vendor",
  firstName: "Marco",
  lastName: "Di Luca",
  title: "HVAC Service Technician",
  methods: {
    emails: [
      {
        id: "cm-marco-email-1",
        value: "marco@coolairservices.example.com",
        label: "contact.method.label.work",
        status: "contact.method.status.active",
      },
    ],
    phones: [
      {
        id: "cm-marco-phone-1",
        value: "+12065550608",
        label: "contact.method.label.mobile",
        status: "contact.method.status.active",
      },
    ],
  },
  createdAt: "2023-07-01T10:00:00.000Z",
  updatedAt: "2024-11-20T09:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

const note1: Note = {
  id: NOTE_1,
  title: "Meridian Tower — Q4 Audit Prep",
  body: "Coordinate with James Hartwell before the January audit. Floors 14–20 had HVAC issues last quarter — confirm repairs were completed. New stairwell signage installed on floors 5–8.\n\nKey reminder: loading dock access requires building management escort after 6pm.",
  createdAt: "2025-10-15T14:00:00.000Z",
  updatedAt: "2025-11-02T10:30:00.000Z",
};

const note2: Note = {
  id: NOTE_2,
  title: "Harbor View — Parking Garage Access",
  body: "Gate remote was replaced in October. New code issued by building management (see codes). Old fob no longer works — collect from team before next visit.",
  createdAt: "2025-10-20T09:00:00.000Z",
  updatedAt: "2025-10-20T09:00:00.000Z",
};

const note3: Note = {
  id: NOTE_3,
  title: "Summit — Roof Access Protocol",
  body: "Roof inspection requires 48-hour advance notice per lease agreement. Contact Tom Reyes directly — building security must accompany. Ladder access only; no freight elevator to roof.",
  createdAt: "2025-09-10T11:00:00.000Z",
  updatedAt: "2025-09-10T11:00:00.000Z",
};

const note4: Note = {
  id: NOTE_4,
  title: "Meridian Jan Audit — Follow-up Items",
  body: "Score: 91/100. Deductions:\n- Fire extinguisher on floor 7 past inspection date (ticket #FM-2241 filed)\n- Exit sign on floor 22 needs bulb replacement\n\nAll other floors clear. Next audit target: February 15.",
  createdAt: "2026-01-10T16:00:00.000Z",
  updatedAt: "2026-01-10T16:30:00.000Z",
};

// ---------------------------------------------------------------------------
// Access Codes
// ---------------------------------------------------------------------------

const codeMeridianDoor: Code = {
  id: CODE_MERIDIAN_DOOR,
  accountId: ACCOUNT_MERIDIAN,
  label: "Main Entrance Keypad",
  codeValue: "4892",
  isEncrypted: false,
  type: "code.type.door",
  notes: "Changes every 90 days — next rotation March 1.",
  createdAt: "2023-02-01T09:30:00.000Z",
  updatedAt: "2025-12-01T09:00:00.000Z",
};

const codeMeridianAlarm: Code = {
  id: CODE_MERIDIAN_ALARM,
  accountId: ACCOUNT_MERIDIAN,
  label: "After-Hours Alarm",
  codeValue: "7731#",
  isEncrypted: false,
  type: "code.type.alarm",
  notes: "Disarm within 30 seconds of entry. Panel is behind reception desk.",
  createdAt: "2023-02-01T09:35:00.000Z",
  updatedAt: "2025-06-15T10:00:00.000Z",
};

const codeHarborGate: Code = {
  id: CODE_HARBOR_GATE,
  accountId: ACCOUNT_HARBOR,
  label: "Parking Garage Gate",
  codeValue: "1047",
  isEncrypted: false,
  type: "code.type.gate",
  notes: "Updated October 2025.",
  createdAt: "2023-03-15T10:00:00.000Z",
  updatedAt: "2025-10-05T08:00:00.000Z",
};

const codeSummitLockbox: Code = {
  id: CODE_SUMMIT_LOCKBOX,
  accountId: ACCOUNT_SUMMIT,
  label: "Facilities Lockbox",
  codeValue: "3318",
  isEncrypted: false,
  type: "code.type.lockbox",
  notes: "Lockbox mounted on wall next to freight elevator, Basement B1.",
  createdAt: "2023-05-05T11:00:00.000Z",
  updatedAt: "2024-08-20T09:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

const evtAuditMeridianDone: CalendarEvent = {
  id: EVT_AUDIT_MERIDIAN_DONE,
  type: "calendarEvent.type.audit",
  status: "calendarEvent.status.completed",
  summary: "Monthly Audit — Meridian Tower",
  description: "Full floor inspection, floors 1–32 (excl. 13). Score: 91/100.",
  scheduledFor: "2026-01-10T09:00:00.000Z",
  occurredAt: "2026-01-10T09:15:00.000Z",
  durationMinutes: 180,
  auditData: {
    accountId: ACCOUNT_MERIDIAN,
    score: 91,
    floorsVisited: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22,
      23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
    ],
  },
  createdAt: "2025-12-20T10:00:00.000Z",
  updatedAt: "2026-01-10T12:30:00.000Z",
};

const evtAuditHarborSched: CalendarEvent = {
  id: EVT_AUDIT_HARBOR_SCHED,
  type: "calendarEvent.type.audit",
  status: "calendarEvent.status.scheduled",
  summary: "Quarterly Audit — Harbor View Plaza",
  description:
    "Full building walk-through. Coordinate parking garage access with Priya.",
  scheduledFor: "2026-03-05T10:00:00.000Z",
  durationMinutes: 120,
  auditData: {
    accountId: ACCOUNT_HARBOR,
  },
  createdAt: "2026-01-15T09:00:00.000Z",
  updatedAt: "2026-01-15T09:00:00.000Z",
};

const evtAuditSummitDone: CalendarEvent = {
  id: EVT_AUDIT_SUMMIT_DONE,
  type: "calendarEvent.type.audit",
  status: "calendarEvent.status.completed",
  summary: "Bi-Monthly Audit — Summit Office Park",
  description:
    "All 8 floors inspected. Minor issue with exterior signage on floor 3.",
  scheduledFor: "2025-12-12T08:30:00.000Z",
  occurredAt: "2025-12-12T08:45:00.000Z",
  durationMinutes: 90,
  auditData: {
    accountId: ACCOUNT_SUMMIT,
    score: 87,
    floorsVisited: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  createdAt: "2025-11-20T14:00:00.000Z",
  updatedAt: "2025-12-12T11:00:00.000Z",
};

const evtMeetingMeridian: CalendarEvent = {
  id: EVT_MEETING_MERIDIAN,
  type: "calendarEvent.type.meeting",
  status: "calendarEvent.status.completed",
  summary: "Q1 Planning — Meridian Tower",
  description:
    "Annual review with James Hartwell. Discussed upcoming compliance deadline and lease renewal.",
  scheduledFor: "2026-01-08T14:00:00.000Z",
  occurredAt: "2026-01-08T14:05:00.000Z",
  durationMinutes: 60,
  location: "Meridian Tower — Conference Room 3A",
  createdAt: "2025-12-18T11:00:00.000Z",
  updatedAt: "2026-01-08T15:10:00.000Z",
};

const evtCallHarbor: CalendarEvent = {
  id: EVT_CALL_HARBOR,
  type: "calendarEvent.type.call",
  status: "calendarEvent.status.completed",
  summary: "Audit Scheduling Call — Harbor View",
  description:
    "Called Priya to confirm March audit date. She requested morning slot before 11am.",
  scheduledFor: "2026-01-16T10:00:00.000Z",
  occurredAt: "2026-01-16T10:02:00.000Z",
  durationMinutes: 15,
  createdAt: "2026-01-15T14:00:00.000Z",
  updatedAt: "2026-01-16T10:20:00.000Z",
};

const evtAuditWestfieldCanceled: CalendarEvent = {
  id: EVT_AUDIT_WESTFIELD_CANCELED,
  type: "calendarEvent.type.audit",
  status: "calendarEvent.status.canceled",
  summary: "Final Audit — Westfield Corporate Center",
  description: "Canceled — account went inactive before audit date.",
  scheduledFor: "2025-09-15T09:00:00.000Z",
  durationMinutes: 120,
  auditData: {
    accountId: ACCOUNT_WESTFIELD,
  },
  createdAt: "2025-08-20T09:00:00.000Z",
  updatedAt: "2025-09-01T10:00:00.000Z",
};

const evtMeetingSummit: CalendarEvent = {
  id: EVT_MEETING_SUMMIT,
  type: "calendarEvent.type.meeting",
  status: "calendarEvent.status.scheduled",
  summary: "Audit Debrief — Summit Office Park",
  description:
    "Walk through December findings with Tom. Discuss exterior signage fix timeline.",
  scheduledFor: "2026-02-03T13:00:00.000Z",
  durationMinutes: 45,
  location: "Video call",
  createdAt: "2025-12-15T09:00:00.000Z",
  updatedAt: "2025-12-15T09:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Relations — AccountContacts
// ---------------------------------------------------------------------------

const accountContacts: Record<string, AccountContact> = {
  [AC_SARAH_MERIDIAN]: {
    accountId: ACCOUNT_MERIDIAN,
    contactId: CONTACT_SARAH,
    role: "account.contact.role.primary",
    isPrimary: true,
  },
  [AC_JAMES_MERIDIAN]: {
    accountId: ACCOUNT_MERIDIAN,
    contactId: CONTACT_JAMES,
    role: "account.contact.role.billing",
    isPrimary: false,
  },
  [AC_PRIYA_HARBOR]: {
    accountId: ACCOUNT_HARBOR,
    contactId: CONTACT_PRIYA,
    role: "account.contact.role.primary",
    isPrimary: true,
  },
  [AC_MARCO_HARBOR]: {
    accountId: ACCOUNT_HARBOR,
    contactId: CONTACT_MARCO,
    role: "account.contact.role.technical",
    isPrimary: false,
  },
  [AC_TOM_SUMMIT]: {
    accountId: ACCOUNT_SUMMIT,
    contactId: CONTACT_TOM,
    role: "account.contact.role.primary",
    isPrimary: true,
  },
  [AC_LINDA_WESTFIELD]: {
    accountId: ACCOUNT_WESTFIELD,
    contactId: CONTACT_LINDA,
    role: "account.contact.role.primary",
    isPrimary: true,
  },
  [AC_SARAH_WESTFIELD]: {
    accountId: ACCOUNT_WESTFIELD,
    contactId: CONTACT_SARAH,
    role: "account.contact.role.technical",
    isPrimary: false,
  },
};

// ---------------------------------------------------------------------------
// Relations — AccountCodes
// ---------------------------------------------------------------------------

const accountCodes: Record<string, AccountCode> = {
  [ACODE_MERIDIAN_DOOR]: {
    accountId: ACCOUNT_MERIDIAN,
    codeId: CODE_MERIDIAN_DOOR,
  },
  [ACODE_MERIDIAN_ALARM]: {
    accountId: ACCOUNT_MERIDIAN,
    codeId: CODE_MERIDIAN_ALARM,
  },
  [ACODE_HARBOR_GATE]: {
    accountId: ACCOUNT_HARBOR,
    codeId: CODE_HARBOR_GATE,
  },
  [ACODE_SUMMIT_LOCKBOX]: {
    accountId: ACCOUNT_SUMMIT,
    codeId: CODE_SUMMIT_LOCKBOX,
  },
};

// ---------------------------------------------------------------------------
// Relations — EntityLinks
// ---------------------------------------------------------------------------

const entityLinks: Record<string, EntityLink> = {
  [LINK_NOTE1_MERIDIAN]: {
    linkType: "note",
    noteId: NOTE_1,
    entityType: "account",
    entityId: ACCOUNT_MERIDIAN,
  },
  [LINK_NOTE2_HARBOR]: {
    linkType: "note",
    noteId: NOTE_2,
    entityType: "account",
    entityId: ACCOUNT_HARBOR,
  },
  [LINK_NOTE3_SUMMIT]: {
    linkType: "note",
    noteId: NOTE_3,
    entityType: "account",
    entityId: ACCOUNT_SUMMIT,
  },
  [LINK_NOTE4_EVT1]: {
    linkType: "note",
    noteId: NOTE_4,
    entityType: "calendarEvent",
    entityId: EVT_AUDIT_MERIDIAN_DONE,
  },
};

// ---------------------------------------------------------------------------
// Assembled AutomergeDoc
// ---------------------------------------------------------------------------

export const DUMMY_DOC: AutomergeDoc = {
  organizations: {
    [DUMMY_ORG_ID]: org,
  },
  accounts: {
    [ACCOUNT_MERIDIAN]: accountMeridian,
    [ACCOUNT_HARBOR]: accountHarbor,
    [ACCOUNT_SUMMIT]: accountSummit,
    [ACCOUNT_WESTFIELD]: accountWestfield,
  },
  contacts: {
    [CONTACT_SARAH]: contactSarah,
    [CONTACT_JAMES]: contactJames,
    [CONTACT_PRIYA]: contactPriya,
    [CONTACT_TOM]: contactTom,
    [CONTACT_LINDA]: contactLinda,
    [CONTACT_MARCO]: contactMarco,
  },
  notes: {
    [NOTE_1]: note1,
    [NOTE_2]: note2,
    [NOTE_3]: note3,
    [NOTE_4]: note4,
  },
  codes: {
    [CODE_MERIDIAN_DOOR]: codeMeridianDoor,
    [CODE_MERIDIAN_ALARM]: codeMeridianAlarm,
    [CODE_HARBOR_GATE]: codeHarborGate,
    [CODE_SUMMIT_LOCKBOX]: codeSummitLockbox,
  },
  calendarEvents: {
    [EVT_AUDIT_MERIDIAN_DONE]: evtAuditMeridianDone,
    [EVT_AUDIT_HARBOR_SCHED]: evtAuditHarborSched,
    [EVT_AUDIT_SUMMIT_DONE]: evtAuditSummitDone,
    [EVT_MEETING_MERIDIAN]: evtMeetingMeridian,
    [EVT_CALL_HARBOR]: evtCallHarbor,
    [EVT_AUDIT_WESTFIELD_CANCELED]: evtAuditWestfieldCanceled,
    [EVT_MEETING_SUMMIT]: evtMeetingSummit,
  },
  // Legacy collections — empty (data lives in calendarEvents)
  audits: {},
  interactions: {},
  settings: DEFAULT_SETTINGS,
  relations: {
    accountContacts,
    accountCodes,
    entityLinks,
  },
};
