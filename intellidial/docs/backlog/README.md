# Backlog

Planned features and tasks not yet implemented.

## Current Backlog Items

| Item | Priority | Description |
|------|----------|-------------|
| [Email Sending](./EMAIL_SENDING.md) | High | Real email for team invitations (Resend/SendGrid/Nodemailer) |
| [Notifications](./NOTIFICATIONS.md) | Medium | In-app + email notifications (project complete, usage warnings) |
| [Phone Numbers](./PHONE_NUMBERS.md) | Medium | Per-org caller ID (provision or BYON) — one number via env exists |
| [Settings Org Scoping](./SETTINGS_ORG_SCOPING.md) | Medium | Scope subscription, payments, invoices by org; real SA payment gateway |

## Suggested Order

1. **Email Sending** — Unblocks team invites and notification emails
2. **Settings org scoping** — When adding real billing (PayFast/PayGate)
3. **Notifications** — After email sending works
4. **Phone Numbers** — Per-org numbers when scaling beyond single number

---

## How to Use

- **Add**: Create a new `.md` file per feature
- **Update**: Mark items ✅ done, 🚧 in progress, ❌ not started
- **Link**: Include file paths and line numbers
- **Break down**: Use checkboxes for sub-tasks

## Priority

- **High**: Blocks core functionality
- **Medium**: Important, not blocking
- **Low**: Nice to have
