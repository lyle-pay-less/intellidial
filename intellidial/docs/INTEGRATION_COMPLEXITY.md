# Integration Complexity Analysis

This document breaks down the technical complexity of implementing integrations with Zapier and CRMs (Salesforce, HubSpot).

## Current Integration Pattern

Your codebase already follows a good pattern:
- **Server-side API routes** (`/api/*`)
- **API key authentication** (VAPI uses `VAPI_API_KEY` from env)
- **Org-scoping** (all requests validate `x-user-id` → `orgId`)
- **REST APIs** (simple HTTP calls)

---

## 1. Zapier Integration

### Complexity: **MEDIUM** ⚙️

### What You Need to Build:

#### A. Zapier Platform App (One-time setup)
1. **Create Zapier App** (via Zapier Platform UI or CLI)
   - App name, description, logo
   - **Time:** 1-2 hours

2. **Authentication** (OAuth 2.0)
   - Zapier handles OAuth flow, but you need:
     - `/oauth/authorize` endpoint
     - `/oauth/token` endpoint
     - Token refresh logic
   - **Complexity:** Medium (standard OAuth flow)
   - **Time:** 4-6 hours

3. **Triggers** (Zapier polls your API)
   - `New Call Result` trigger
   - `Call Completed` trigger
   - Endpoints: `GET /zapier/triggers/call-result`
   - Return array of call results (Zapier polls every 5-15 min)
   - **Complexity:** Low (just return JSON)
   - **Time:** 2-3 hours per trigger

4. **Actions** (Zapier calls your API)
   - `Create Call` action
   - `Update Project` action
   - Endpoints: `POST /zapier/actions/create-call`
   - Accept JSON payload, return result
   - **Complexity:** Low-Medium (validate input, call your existing APIs)
   - **Time:** 3-4 hours per action

### Technical Requirements:

```typescript
// Example: Zapier trigger endpoint
// GET /api/zapier/triggers/call-result
export async function GET(req: NextRequest) {
  // 1. Authenticate Zapier request (OAuth token)
  const token = req.headers.get('authorization');
  const user = await validateZapierToken(token);
  
  // 2. Get org from user
  const orgId = await getUserOrganization(user.id);
  
  // 3. Return recent call results (Zapier polls this)
  const calls = await getRecentCallResults(orgId, {
    since: req.nextUrl.searchParams.get('since'), // Zapier provides this
    limit: 100
  });
  
  return NextResponse.json(calls);
}
```

### Pros:
- ✅ **Zapier handles complexity** - They manage OAuth, UI, user setup
- ✅ **One integration = 5000+ apps** - Users connect to anything
- ✅ **No per-app code** - You build once, users connect everywhere
- ✅ **Zapier SDK** - Good documentation and tools

### Cons:
- ❌ **OAuth required** - More complex than API keys
- ❌ **Polling overhead** - Triggers poll your API (can be rate-limited)
- ❌ **Zapier approval process** - Need to submit app for public use

### Estimated Time:
- **Initial setup:** 1-2 days (OAuth + 2 triggers + 2 actions)
- **Testing & polish:** 1 day
- **Zapier review:** 1-2 weeks (their process)
- **Total:** ~2-3 days dev + 1-2 weeks approval

### Difficulty: **6/10** (Medium)

---

## 2. CRM Integration (Salesforce)

### Complexity: **MEDIUM-HIGH** ⚙️⚙️

### What You Need to Build:

#### A. OAuth 2.0 Authentication Flow
1. **User connects Salesforce** (in your UI)
   - Redirect to Salesforce OAuth URL
   - User authorizes → redirects back with code
   - Exchange code for access token + refresh token
   - Store tokens securely (encrypted in Firestore)
   - **Complexity:** Medium (standard OAuth, but more steps)
   - **Time:** 4-6 hours

2. **Token Management**
   - Store `accessToken`, `refreshToken`, `instanceUrl` per org
   - Auto-refresh expired tokens
   - Handle token revocation
   - **Complexity:** Medium (need background jobs or refresh on-demand)
   - **Time:** 2-3 hours

#### B. Salesforce API Integration
1. **Create Lead from Call Result**
   ```typescript
   // POST to Salesforce REST API
   POST https://{instanceUrl}/services/data/v58.0/sobjects/Lead/
   {
     "FirstName": "John",
     "LastName": "Doe",
     "Company": "Acme Corp",
     "Phone": "+27111234567",
     "Status": "Open - Not Contacted",
     "Description": "Qualified via AI call on 2026-02-05"
   }
   ```
   - **Complexity:** Low (just HTTP POST)
   - **Time:** 2-3 hours

2. **Update Existing Lead**
   - Query by phone/email first
   - Update if exists, create if not
   - **Complexity:** Medium (need SOQL query)
   - **Time:** 3-4 hours

3. **Field Mapping**
   - Map your call results → Salesforce fields
   - Handle custom fields
   - User configuration UI (which fields map where)
   - **Complexity:** Medium-High (needs UI + validation)
   - **Time:** 4-6 hours

#### C. Error Handling & Edge Cases
- Rate limiting (Salesforce has strict limits)
- Invalid field names
- Required fields missing
- API version changes
- **Complexity:** Medium (lots of edge cases)
   - **Time:** 2-3 hours

### Technical Requirements:

```typescript
// Example: Salesforce integration
// POST /api/integrations/salesforce/sync-call
export async function POST(req: NextRequest) {
  // 1. Get org and validate
  const orgId = await getOrgFromRequest(req);
  
  // 2. Get Salesforce credentials (stored per org)
  const sfCreds = await getSalesforceCredentials(orgId);
  if (!sfCreds) {
    return NextResponse.json({ error: "Salesforce not connected" }, { status: 400 });
  }
  
  // 3. Refresh token if needed
  const accessToken = await refreshIfNeeded(sfCreds);
  
  // 4. Get call result from request
  const { callResult } = await req.json();
  
  // 5. Map to Salesforce Lead format
  const lead = {
    FirstName: callResult.contactName?.split(' ')[0],
    LastName: callResult.contactName?.split(' ').slice(1).join(' '),
    Phone: callResult.phoneNumber,
    Company: callResult.company || 'Unknown',
    Status: callResult.qualified ? 'Qualified' : 'Open',
    Description: `AI Call Result: ${callResult.transcript}`
  };
  
  // 6. Create/update in Salesforce
  const sfResult = await createOrUpdateLead(accessToken, sfCreds.instanceUrl, lead);
  
  return NextResponse.json({ success: true, leadId: sfResult.id });
}
```

### Pros:
- ✅ **Well-documented API** - Salesforce has excellent docs
- ✅ **REST API** - Standard HTTP, easy to work with
- ✅ **High value** - Most requested integration

### Cons:
- ❌ **OAuth complexity** - More complex than API keys
- ❌ **Rate limits** - Strict limits (can be an issue at scale)
- ❌ **Field mapping** - Users need to configure mappings
- ❌ **SOQL queries** - Need to learn Salesforce query language
- ❌ **Per-org storage** - Need to store credentials securely

### Estimated Time:
- **OAuth flow:** 1 day
- **Basic sync (create lead):** 1 day
- **Update existing:** 0.5 days
- **Field mapping UI:** 1-2 days
- **Error handling:** 0.5 days
- **Testing:** 1 day
- **Total:** ~5-6 days

### Difficulty: **7/10** (Medium-High)

---

## 3. CRM Integration (HubSpot)

### Complexity: **MEDIUM** ⚙️

### What You Need to Build:

#### A. OAuth 2.0 Authentication Flow
- Similar to Salesforce, but simpler
- HubSpot OAuth is more straightforward
- **Time:** 3-4 hours

#### B. HubSpot API Integration
1. **Create Contact from Call Result**
   ```typescript
   // POST to HubSpot API
   POST https://api.hubapi.com/crm/v3/objects/contacts
   {
     "properties": {
       "firstname": "John",
       "lastname": "Doe",
       "phone": "+27111234567",
       "company": "Acme Corp"
     }
   }
   ```
   - **Complexity:** Low (simpler than Salesforce)
   - **Time:** 2-3 hours

2. **Create Deal/Opportunity**
   - Link contact to deal
   - Set deal stage based on call outcome
   - **Complexity:** Low-Medium
   - **Time:** 2-3 hours

### Pros:
- ✅ **Simpler API** - More straightforward than Salesforce
- ✅ **Better docs** - HubSpot has great developer resources
- ✅ **Less rate limiting** - More generous limits
- ✅ **REST API** - Standard HTTP

### Cons:
- ❌ **Still OAuth** - Same complexity as Salesforce
- ❌ **Field mapping** - Still need user configuration
- ❌ **Per-org storage** - Credentials storage

### Estimated Time:
- **OAuth flow:** 0.5 days
- **Basic sync:** 1 day
- **Deal creation:** 0.5 days
- **Field mapping UI:** 1 day
- **Testing:** 0.5 days
- **Total:** ~3-4 days

### Difficulty: **6/10** (Medium)

---

## Comparison Summary

| Integration | Complexity | Dev Time | OAuth Required | Field Mapping | Difficulty |
|------------|-----------|----------|----------------|---------------|------------|
| **Zapier** | Medium | 2-3 days | ✅ Yes | ❌ No | 6/10 |
| **Salesforce** | Medium-High | 5-6 days | ✅ Yes | ✅ Yes | 7/10 |
| **HubSpot** | Medium | 3-4 days | ✅ Yes | ✅ Yes | 6/10 |

---

## Recommendations

### Start with Zapier (Easiest Path)
**Why:**
1. **One integration = many apps** - Users connect to 5000+ tools
2. **No field mapping** - Zapier handles that
3. **Less code** - You build triggers/actions, Zapier does the rest
4. **Faster to market** - 2-3 days vs 5-6 days per CRM

**Then add direct CRM integrations** for users who want:
- Faster sync (real-time vs polling)
- More control
- Native CRM features

### Implementation Order:
1. **Zapier** (2-3 days) → Immediate value, works with everything
2. **HubSpot** (3-4 days) → Easier than Salesforce
3. **Salesforce** (5-6 days) → Most complex but highest demand

---

## Technical Infrastructure Needed

### For All Integrations:
1. **Integration Storage** (Firestore)
   ```typescript
   integrations/{orgId}
     zapier: { connected: boolean, token?: string }
     salesforce: { 
       connected: boolean,
       accessToken: string,
       refreshToken: string,
       instanceUrl: string,
       expiresAt: timestamp
     }
     hubspot: { ... }
   ```

2. **Settings UI** (`/dashboard/settings/integrations`)
   - Connect/disconnect buttons
   - Status indicators
   - Field mapping (for CRMs)

3. **Background Jobs** (optional)
   - Token refresh
   - Retry failed syncs
   - Or handle on-demand (simpler)

---

## Complexity Breakdown

### Low Complexity (1-3 hours each):
- ✅ Simple API calls (create contact, create lead)
- ✅ Basic error handling
- ✅ Webhook endpoints (for Zapier)

### Medium Complexity (3-6 hours each):
- ⚙️ OAuth flow implementation
- ⚙️ Token refresh logic
- ⚙️ Field mapping UI
- ⚙️ Error handling & retries

### High Complexity (6+ hours):
- ⚙️⚙️ Complex field mapping (custom fields, validation)
- ⚙️⚙️ Rate limiting & queuing
- ⚙️⚙️ Background job system
- ⚙️⚙️ Multi-step syncs (contact → deal → task)

---

## Bottom Line

**Zapier is your best first integration:**
- ✅ Fastest to implement (2-3 days)
- ✅ Highest value (works with everything)
- ✅ No field mapping complexity
- ✅ Users can self-serve

**Then add direct CRM integrations** for power users who need:
- Real-time sync
- More control
- Native CRM features

**Total time for all 3:** ~10-13 days of development
