#!/bin/bash
# Script to verify Cloud Build service account has access to Firebase secrets
# Run this to check permissions before deploying

PROJECT_ID="intellidial-39ca7"
CLOUD_BUILD_SA="81645167087@cloudbuild.gserviceaccount.com"

echo "Checking Cloud Build service account permissions..."
echo "Service Account: $CLOUD_BUILD_SA"
echo ""

SECRETS=(
  "next-public-firebase-api-key"
  "next-public-firebase-auth-domain"
  "next-public-firebase-project-id"
  "next-public-firebase-storage-bucket"
  "next-public-firebase-messaging-sender-id"
  "next-public-firebase-app-id"
)

echo "Checking if secrets exist:"
for secret in "${SECRETS[@]}"; do
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
    echo "  ✅ $secret exists"
  else
    echo "  ❌ $secret NOT FOUND"
  fi
done

echo ""
echo "Checking Cloud Build service account IAM permissions:"
gcloud projects get-iam-policy "$PROJECT_ID" \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$CLOUD_BUILD_SA" \
  --format="table(bindings.role)" \
  | grep -i "secret\|Secret" || echo "  ⚠️  No Secret Manager roles found"

echo ""
echo "To grant access, run:"
echo "gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "  --member='serviceAccount:$CLOUD_BUILD_SA' \\"
echo "  --role='roles/secretmanager.secretAccessor'"
