# Switch gcloud project and ADC quota to IntelliDial.
# Run this when you need to use IntelliDial (intellidial-39ca7) instead of another project.
# Usage: .\switch-to-intellidial.ps1
#
# First-time or after credential expiry:
#   gcloud auth login
#   gcloud auth application-default login
# Then run this script to point project + ADC quota at intellidial-39ca7.

$ProjectId = "intellidial-39ca7"

Write-Host "Setting gcloud project to $ProjectId..." -ForegroundColor Cyan
gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Setting Application Default Credentials quota project to $ProjectId..." -ForegroundColor Cyan
gcloud auth application-default set-quota-project $ProjectId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Active project and ADC quota are now $ProjectId." -ForegroundColor Green
