# Build Intellidial Docker image locally (same args as cloudbuild.yaml)
# Run from repo root or from intellidial/:  .\intellidial\build-image-local.ps1
# Requires: Docker Desktop running

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

docker build `
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyATWgJDYOPR67Dnj2baviRTpneh54QkCBU `
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=intellidial-39ca7.firebaseapp.com `
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=intellidial-39ca7 `
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=intellidial-39ca7.firebasestorage.app `
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=81645167087 `
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=1:81645167087:web:ae25ef5c452b052b0e961a `
  --build-arg NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/growth-intellidial/30min `
  -t intellidial:local `
  -f Dockerfile `
  .

if ($LASTEXITCODE -eq 0) {
  Write-Host "Image built: intellidial:local"
  docker images intellidial:local
}
