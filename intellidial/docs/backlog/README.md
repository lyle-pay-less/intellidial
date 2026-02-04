# Backlog

This folder contains tasks and features that are planned but not yet implemented.

## Current Backlog Items

| Item | Priority | Status | Description |
|------|----------|--------|-------------|
| [Email Sending](./EMAIL_SENDING.md) | High | ❌ Not started | Real email for team invitations |
| [Gemini Integration](./GEMINI_INTEGRATION.md) | High | ❌ Not started | Replace mock with Gemini API for Instructions tab auto-fill |
| [VAPI Assistant Creation](./VAPI_ASSISTANT_CREATION.md) | High | ❌ Not started | Create VAPI assistant per project when ready for calls |
| [VAPI Calls & Webhooks](./VAPI_CALLS_WEBHOOKS.md) | High | ❌ Not started | Real outbound calls and call-ended webhook |
| [Phone Numbers](./PHONE_NUMBERS.md) | High | ❌ Not started | Per-org caller ID (provision or BYON) |
| [Contacts Firestore Persistence](./CONTACTS_FIRESTORE_PERSISTENCE.md) | High | ❌ Not started | Persist contacts to Firestore (currently in-memory only) |
| [Settings Org Scoping](./SETTINGS_ORG_SCOPING.md) | Medium | ❌ Not started | Scope subscription, payments, invoices by org |
| [Lead Generation Research](./LEAD_GENERATION_RESEARCH.md) | Medium | ❌ Not started | Research real SA companies for lead lists (replace generic names) |
| [Value Prop Communication](./VALUE_PROP_COMMUNICATION.md) | Medium | ❌ Not started | Communicate value proposition efficiently across all channels (landing page, emails, sales scripts, etc.) |

## Implementation Order (Recommended)

1. **Contacts Firestore Persistence** — Prevent data loss on restart
2. **Gemini Integration** — Instructions tab auto-fill (no external call dependency)
3. **VAPI Assistant Creation** — Create agents from project config
4. **Phone Numbers** — Per-org caller ID (required before real calls)
5. **VAPI Calls & Webhooks** — Real calls and call result handling
6. **Email Sending** — Team invitations (standalone)
7. **Settings Org Scoping** — When wiring real Stripe/billing

---

## How to Use This Backlog

1. **Add new items**: Create a new `.md` file for each major feature/task
2. **Update status**: Mark completed items with ✅, in-progress with 🚧, not started with ❌
3. **Link to code**: Include file paths and line numbers where relevant
4. **Break down tasks**: Use checkboxes for sub-tasks
5. **Add context**: Include why it's needed, current state, and requirements

## Priority Guidelines

- **High**: Blocks core functionality or user experience
- **Medium**: Important but not blocking
- **Low**: Nice to have, can be deferred

---

## Quick Add Template

```markdown
# [Feature Name] - Backlog

## Current Status
- ✅ What's done
- ❌ What's not done

## Task: [Description]

**Location**: `path/to/file.ts`

**What needs to be done**:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Notes**:
- Additional context
- Dependencies
- Considerations
```
