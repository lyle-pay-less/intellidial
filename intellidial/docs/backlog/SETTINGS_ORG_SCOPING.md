# Settings Org Scoping - Backlog

## Subscription, Payments, Invoices per Org

### Current Status
- ✅ Settings page UI (subscription, payment method, invoices)
- ✅ Mock data returned
- ❌ **Settings API does not validate org; returns same mock for all**
- ❌ **No real SA payment gateway (PayFast/PayGate) + Firestore integration**

### Task: Scope Settings by Org

**Location**: `src/app/api/settings/route.ts`, `src/app/api/settings/invoices/[id]/download/route.ts`

**What needs to be done**:
1. Add `x-user-id` header requirement to settings API
2. Get orgId via `getUserOrganization(userId)`
3. Filter/query subscription, payment, invoices by orgId
4. When wiring real data (SA payment gateway + Firestore):
   - [ ] Store subscription per org
   - [ ] Store payment method per org
   - [ ] Store invoices per org
5. Invoice download: validate invoice belongs to user's org

**Priority**: Medium (important for production; mock works for MVP)
