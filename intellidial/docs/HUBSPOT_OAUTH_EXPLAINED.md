# How HubSpot OAuth Works for SaaS Multi-Tenant Apps

## The Standard SaaS Model

### ✅ How It Actually Works (What We're Building)

1. **Intellidial Creates ONE HubSpot App**
   - You register ONE app in HubSpot Developer Portal
   - You get ONE Client ID and ONE Client Secret
   - These go in YOUR `.env` file (server-side only, never exposed)
   - This is YOUR app that all your customers will authorize

2. **Each Customer Connects Their Own HubSpot Account**
   - Customer clicks "Connect HubSpot" in Intellidial
   - They're redirected to HubSpot's authorization page
   - HubSpot shows: "Intellidial wants to access your HubSpot account"
   - Customer clicks "Authorize"
   - HubSpot gives Intellidial an access token FOR THAT CUSTOMER'S ACCOUNT
   - We store that token in Firestore, scoped to that customer's organization

3. **Result:**
   - Each customer has their own access token
   - Each customer's data is isolated
   - Customers can revoke access anytime from HubSpot
   - No customer ever sees or needs to provide Client ID/Secret

### 🔑 Key Point: Client ID/Secret vs Access Tokens

- **Client ID/Secret** = YOUR app credentials (one set, in `.env`)
- **Access Tokens** = Per-customer authorization tokens (stored in database)

Think of it like Google Sign-In:
- Google provides the OAuth app (shared)
- But each user signs in with their own Google account
- Each user's data is separate

## Environment Variables Setup

### For Intellidial (Your Company)

```bash
# These are YOUR HubSpot app credentials
# Register ONE app at: https://developers.hubspot.com/
# All customers will authorize THIS app
HUBSPOT_CLIENT_ID=your-app-client-id
HUBSPOT_CLIENT_SECRET=your-app-client-secret
HUBSPOT_REDIRECT_URI=https://intellidial.co.za/dashboard/settings/integrations/hubspot/callback
```

**These stay in `.env`** - they're YOUR app credentials, not customer credentials.

### For Customers

**Customers don't need to provide anything!** They just:
1. Click "Connect HubSpot"
2. Authorize on HubSpot's page
3. Done!

## Data Storage Per Customer

When a customer connects, we store in Firestore:

```typescript
{
  orgId: "customer-org-123",
  accessToken: "token-for-customer-1",  // Unique per customer
  refreshToken: "refresh-for-customer-1", // Unique per customer
  hubspotAccountId: "12345678", // Customer's HubSpot portal ID
  connectedAt: "2024-01-01T00:00:00Z"
}
```

Each customer gets their own record with their own tokens.

## Security Model

### ✅ What's Secure

1. **Client Secret Never Exposed**
   - Stays in `.env` (server-side only)
   - Never sent to browser
   - Never shown to customers

2. **Customer Tokens Are Isolated**
   - Each customer's tokens are separate
   - Stored in Firestore, scoped by `orgId`
   - One customer can't access another's data

3. **OAuth Standard**
   - Industry-standard flow
   - Same model used by Slack, Zapier, etc.
   - Customers can revoke access anytime

### 🔒 What Customers Control

- They authorize YOUR app to access THEIR HubSpot account
- They can revoke access from HubSpot settings anytime
- They see exactly what permissions are requested
- They control their own data

## When Would Customers Need Custom App?

**Only if:**
- Their company policy requires using their own HubSpot app
- They need custom scopes not available in your app
- They're an enterprise with compliance requirements

**For 99% of customers:** They just click "Connect" and authorize. No credentials needed.

## Implementation Checklist

- [x] Register ONE HubSpot app in HubSpot Developer Portal
- [x] Add Client ID/Secret to `.env` (your app credentials)
- [x] Implement OAuth flow (redirect → authorize → callback)
- [x] Store access tokens per organization in Firestore
- [x] Use tokens to make API calls on behalf of each customer
- [x] Handle token refresh automatically
- [x] Provide "revoke access" link for customers

## Example Flow

```
Customer clicks "Connect HubSpot"
  ↓
Intellidial redirects to HubSpot with YOUR Client ID
  ↓
HubSpot shows: "Intellidial wants access to your HubSpot account"
  ↓
Customer clicks "Authorize"
  ↓
HubSpot redirects back with authorization code
  ↓
Intellidial exchanges code for access token (using YOUR Client Secret)
  ↓
Intellidial stores token in Firestore: { orgId: "customer-123", accessToken: "..." }
  ↓
Done! Customer can now sync data
```

## Summary

**You (Intellidial):**
- Create ONE HubSpot app
- Put Client ID/Secret in `.env`
- Use these for ALL OAuth flows

**Your Customers:**
- Click "Connect HubSpot"
- Authorize YOUR app
- Get their own access tokens stored securely
- Never see or need Client ID/Secret

This is the standard SaaS integration model. It's secure, easy, and scalable.
