# Notifications System - Backlog

## Current Status

- ✅ UI component exists (`NotificationBell.tsx`) - shows bell icon and dropdown
- ✅ Placeholder message: "No notifications yet"
- ✅ Project settings checkbox: "Email me when this project completes" (saves preference)
- ❌ **No backend implementation** - notifications are not created or stored
- ❌ **No email sending** - project completion emails not sent
- ❌ **No real-time updates** - notifications don't update automatically

---

## Feature Requirements

### 1. Notification Types

**Project Completion**
- Trigger: When a project status changes to "completed"
- Content: Project name, total calls made, successful/failed counts, completion time
- Recipients: Project owner + team members who have "notifyOnComplete" enabled

**Call Results Summary**
- Trigger: Daily/weekly summary (optional)
- Content: Calls made, success rate, captured data highlights
- Recipients: Project owner

**Usage Limit Warnings**
- Trigger: When org reaches 80%, 90%, 100% of call limit
- Content: Current usage, limit, upgrade CTA
- Recipients: Org owner + admins

**Billing Reminders**
- Trigger: Before subscription renewal, payment due
- Content: Invoice amount, due date, payment link
- Recipients: Org owner

**Team Invitations** (already planned in EMAIL_SENDING.md)
- Trigger: When team member is invited
- Content: Inviter name, org name, role, accept link
- Recipients: Invited email address

---

## Implementation Plan

### Phase 1: Data Model

**Firestore Collection: `notifications`**

```typescript
{
  id: string;
  orgId: string;
  userId: string; // recipient user ID
  type: "project_complete" | "usage_warning" | "billing_reminder" | "call_summary";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: {
    projectId?: string;
    projectName?: string;
    callsMade?: number;
    successfulCalls?: number;
    // ... other type-specific data
  };
}
```

**Location**: `src/lib/firebase/types.ts` - add `NotificationDoc` type

---

### Phase 2: API Endpoints

**GET `/api/notifications`**
- Fetch unread notifications for current user
- Query Firestore: `notifications` collection filtered by `userId` and `read: false`
- Return: `{ notifications: NotificationDoc[], unreadCount: number }`

**PATCH `/api/notifications/[id]/read`**
- Mark notification as read
- Update Firestore: set `read: true`, `readAt: timestamp`

**POST `/api/notifications/mark-all-read`**
- Mark all notifications as read for user
- Batch update Firestore

**Location**: `src/app/api/notifications/`

---

### Phase 3: Notification Creation Logic

**Project Completion**
- Location: `src/app/api/projects/[id]/sync-calls/route.ts` or project status update logic
- When project status changes to "completed":
  1. Get project owner + team members with `notifyOnComplete: true`
  2. Create notification document for each user
  3. Send email (if email sending is implemented)

**Usage Warnings**
- Location: `src/app/api/webhooks/vapi/call-ended/route.ts` or usage update logic
- When `callsUsed` reaches threshold (80%, 90%, 100%):
  1. Get org owner + admins
  2. Create notification document
  3. Send email

**Billing Reminders**
- Location: Scheduled job (Cloud Functions or cron)
- Check upcoming renewals, create notifications

---

### Phase 4: UI Updates

**NotificationBell Component**
- Fetch notifications from `/api/notifications`
- Show unread count badge on bell icon
- Display list of notifications (newest first)
- Mark as read on click
- Link to relevant page (project, settings, etc.)

**Real-time Updates** (Optional)
- Use Firebase listeners (`onSnapshot`) for live updates
- Or poll every 30 seconds

**Location**: `src/app/dashboard/NotificationBell.tsx`

---

### Phase 5: Email Integration

**Requires**: Email sending implementation (see `EMAIL_SENDING.md`)

**Email Templates Needed**:
- Project completion email
- Usage warning email
- Billing reminder email

**Location**: `src/lib/email/` (create when email sending is implemented)

---

## Dependencies

1. **Email Sending** - Must implement email service first (Resend/SendGrid/Nodemailer)
   - See: `docs/backlog/EMAIL_SENDING.md`

2. **Firestore** - Already configured ✅

3. **User Authentication** - Already configured ✅

---

## Implementation Checklist

### Backend
- [ ] Create `NotificationDoc` type in `src/lib/firebase/types.ts`
- [ ] Create Firestore `notifications` collection structure
- [ ] Implement `createNotification()` helper in `src/lib/data/store.ts`
- [ ] Implement `getNotifications(userId)` helper
- [ ] Implement `markNotificationRead(id)` helper
- [ ] Create `GET /api/notifications` endpoint
- [ ] Create `PATCH /api/notifications/[id]/read` endpoint
- [ ] Create `POST /api/notifications/mark-all-read` endpoint
- [ ] Add project completion notification creation logic
- [ ] Add usage warning notification creation logic
- [ ] Add billing reminder notification creation logic (future)

### Frontend
- [ ] Update `NotificationBell.tsx` to fetch real notifications
- [ ] Add unread count badge to bell icon
- [ ] Display notification list with titles, messages, timestamps
- [ ] Add "Mark all as read" button
- [ ] Add click handlers to navigate to relevant pages
- [ ] Add loading states
- [ ] Add empty state ("No notifications yet")
- [ ] (Optional) Add real-time updates with Firebase listeners

### Email Integration (after EMAIL_SENDING is done)
- [ ] Create project completion email template
- [ ] Create usage warning email template
- [ ] Create billing reminder email template
- [ ] Send email when notification is created
- [ ] Add email preferences (opt-out per notification type)

### Testing
- [ ] Test notification creation for project completion
- [ ] Test notification fetching and display
- [ ] Test mark as read functionality
- [ ] Test email delivery (when implemented)
- [ ] Test real-time updates (if implemented)

---

## Priority

**Medium** - Nice to have feature, not critical for MVP. Can be implemented after:
1. Email sending is working (for team invitations)
2. Core calling functionality is stable
3. Basic polish is done (error handling, loading states)

---

## Notes

- Notifications can be in-app only (no email) for MVP, then add email later
- Consider notification preferences per user (which types they want)
- Consider notification grouping (e.g., "3 projects completed today")
- Consider notification expiration (auto-mark as read after 7 days?)
