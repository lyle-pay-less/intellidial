# Integrations Page - Production Ready

## Overview

A dedicated integrations page has been created at `/dashboard/integrations` where users can manage all their integrations in one place. The page includes professional logos, secure credential management, and a clean UI.

## Features Implemented

### 1. Dedicated Integrations Page
- **Route:** `/dashboard/integrations`
- **Navigation:** Added "Integrations" link to dashboard sidebar
- **Layout:** Professional card-based layout with integration logos

### 2. HubSpot Integration
- **Logo:** Custom HubSpot logo SVG
- **Connection Status:** Visual indicators (Connected/Not connected)
- **Account Info:** Displays connected HubSpot account name
- **Settings:** Full sync configuration UI (moved from settings page)

### 3. Advanced: Custom HubSpot App Credentials
- **Optional Feature:** Users can use their own HubSpot app credentials
- **Default Behavior:** Uses Intellidial's shared HubSpot app (most users)
- **Security:**
  - Client Secret is encrypted using AES-256-GCM
  - Encryption key stored in environment variable
  - Secret is never displayed in plain text (masked as `••••••••`)
  - Show/hide toggle for secret input

### 4. Secure Credential Storage
- **Encryption:** AES-256-GCM with random IV and auth tag
- **Storage:** Encrypted secrets stored in Firestore
- **API Endpoint:** `/api/integrations/hubspot/credentials`
  - GET: Returns masked credentials
  - POST: Saves and encrypts credentials

### 5. OAuth Flow Updates
- **Custom Credentials Support:** OAuth flow uses custom credentials if provided
- **Token Refresh:** Token refresh uses custom credentials when available
- **Redirects:** All OAuth callbacks redirect to `/dashboard/integrations` instead of settings

## Environment Variables Required

Add to your `.env` file:

```bash
# Integration Encryption Key (REQUIRED for custom credentials)
# Generate a secure 64-character hex string:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
INTEGRATION_ENCRYPTION_KEY=your-64-character-hex-string-here

# HubSpot OAuth (for shared app - still required)
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret
HUBSPOT_REDIRECT_URI=https://intellidial.co.za/dashboard/settings/integrations/hubspot/callback
```

## How It Works

### Standard Flow (Most Users)
1. User clicks "Connect HubSpot" on integrations page
2. OAuth flow uses Intellidial's shared HubSpot app credentials
3. User authorizes on HubSpot
4. Redirects back to integrations page with success message
5. Integration is connected and ready to use

### Custom App Flow (Advanced Users)
1. User expands "Advanced: Custom HubSpot App" section
2. User checks "Use my own HubSpot app credentials"
3. User enters their HubSpot Client ID and Client Secret
4. Client Secret is encrypted and stored securely
5. User clicks "Connect HubSpot"
6. OAuth flow uses their custom credentials
7. All API calls use their custom app

## Security Considerations

### Encryption
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Management:** Environment variable `INTEGRATION_ENCRYPTION_KEY`
- **Key Format:** 64-character hex string (or any string, will be hashed to 256 bits)
- **IV:** Random 16 bytes per encryption
- **Auth Tag:** Included to prevent tampering

### Best Practices
- ✅ Client Secret is never logged or displayed
- ✅ Encryption key is never exposed to client
- ✅ Secrets are encrypted at rest in Firestore
- ✅ OAuth tokens are stored separately from credentials
- ✅ Custom credentials are optional (defaults to shared app)

### Production Checklist
- [ ] Set `INTEGRATION_ENCRYPTION_KEY` in production environment
- [ ] Use a secure key management system (e.g., AWS Secrets Manager, Google Secret Manager)
- [ ] Ensure encryption key is consistent across all instances
- [ ] Never commit encryption key to version control
- [ ] Rotate encryption key periodically (requires re-encrypting all secrets)

## Database Schema Updates

### `HubSpotIntegrationDoc` (Firestore)
Added fields:
```typescript
customClientId?: string;        // User's HubSpot Client ID
customClientSecret?: string;     // Encrypted Client Secret
```

## API Endpoints

### `GET /api/integrations/hubspot/credentials`
Returns masked credentials for current organization.

**Response:**
```json
{
  "clientId": "abc123",
  "clientSecret": "••••••••",
  "useCustomApp": true
}
```

### `POST /api/integrations/hubspot/credentials`
Saves and encrypts credentials.

**Request:**
```json
{
  "clientId": "abc123",
  "clientSecret": "secret123",
  "useCustomApp": true
}
```

**Response:**
```json
{
  "success": true
}
```

## UI Components

### Integrations Page (`/dashboard/integrations`)
- HubSpot integration card with logo
- Connection status badge
- Advanced credentials section (collapsible)
- Sync settings (when connected)
- Coming soon integrations (Salesforce, Google Sheets)

### HubSpot Connection Component
- Connection/disconnection buttons
- Status display
- Error handling

### HubSpot Settings Component
- Auto-sync toggle
- What to sync options (transcript, recording, meetings, deals)
- Lead status mappings
- Deal pipeline/stage configuration

## Migration Notes

### From Settings Page
- HubSpot integration management moved from `/dashboard/settings` to `/dashboard/integrations`
- Settings page still exists but HubSpot section is now in integrations
- OAuth callbacks redirect to integrations page

### Existing Integrations
- Existing integrations continue to work
- Custom credentials feature is opt-in
- No migration needed for existing users

## Future Enhancements

1. **More Integrations:**
   - Salesforce CRM
   - Google Sheets
   - Zapier
   - Slack

2. **Enhanced Security:**
   - Key rotation UI
   - Audit logs for credential changes
   - Two-factor authentication for sensitive operations

3. **Better UX:**
   - Integration health monitoring
   - Sync status dashboard
   - Error notifications

## Testing

### Test Custom Credentials
1. Create a test HubSpot app in HubSpot Developer Portal
2. Get Client ID and Client Secret
3. Go to `/dashboard/integrations`
4. Expand "Advanced" section
5. Enter credentials and save
6. Connect HubSpot
7. Verify OAuth uses custom app

### Test Encryption
1. Save credentials with custom app enabled
2. Check Firestore - secret should be encrypted
3. Disconnect and reconnect - should still work
4. Verify secret is never displayed in plain text

## Troubleshooting

### "INTEGRATION_ENCRYPTION_KEY not configured"
- Set the environment variable in `.env` or production environment
- Restart the application

### "Failed to decrypt custom secret"
- Encryption key may have changed
- User needs to re-enter credentials
- Check that key is consistent across instances

### OAuth fails with custom credentials
- Verify Client ID and Secret are correct
- Check redirect URI matches HubSpot app settings
- Ensure scopes match what's requested
