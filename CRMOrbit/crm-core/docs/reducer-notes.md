# Reducer Behavior Notes

This file summarizes reducer intent and guardrails. All reducers must be pure.

## Organization
- organization.created: create org with initial status, set createdAt/updatedAt.
- organization.status.updated: update status, bump updatedAt.
- Reject duplicate ids or missing orgs.

## Account
- account.created: require existing organization, set createdAt/updatedAt.
- account.status.updated: update status, bump updatedAt.
- Reject duplicate ids or missing accounts.

## Contact
- contact.created: require emails/phones arrays, set createdAt/updatedAt.
- contact.method.added: append to emails or phones, bump updatedAt.
- contact.method.updated: replace by index, bump updatedAt.
- Reject duplicate ids, missing contacts, invalid method type, or out-of-bounds index.

## AccountContact
- account.contact.linked: require account+contact, enforce unique link id and tuple.
- account.contact.setPrimary: ensure single primary per account+role.
- account.contact.unsetPrimary: clear primary flag.
- Reject missing relations, missing entities, or duplicates.

## Note
- note.created: create note, set createdAt (payload or event timestamp), set updatedAt.
- note.updated: update title/body, bump updatedAt.
- Reject duplicate ids or missing notes.

## NoteLink
- note.linked: require note and entity existence, enforce unique link.
- note.unlinked: remove link by id or (noteId, entityType, entityId) match.
- Reject missing notes, missing entities, or missing links.

## Interaction
- interaction.logged: create interaction, set createdAt/updatedAt.
- Reject duplicate ids.
