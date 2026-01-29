# Push doctor folder to lyle-pay-less/intellidial

GitHub blocked the push because the **parent repo** (`C:\code`) was used, and its history contains secrets in `kulula.py` and `bigquery_service_account.json` (outside `doctor`). Push **only** from `doctor` so intellidial gets no secrets.

**1. Use only the `doctor` repo** (so Git never sees `kulula.py` or `bigquery_service_account.json`):

```powershell
cd C:\code\doctor
```

If `doctor` already has a `.git` (e.g. from a previous attempt), remove it so we start clean and don't accidentally use the parent repo:

```powershell
Remove-Item -Recurse -Force .git
```

**2. Create a repo that contains only `doctor` and push it:**

```powershell
git init
git remote add origin https://github.com/lyle-pay-less/intellidial.git
git add .
git commit -m "Intellidial: calling pipeline + Next.js marketing site and voice demo"
git branch -M main
git push -u origin main --force
```

- Run every command from `C:\code\doctor`. After `git init`, `git status` should show only files under `doctor` (no `doctor/` path prefix).
- If you see "Permission denied" on `.git`, close other terminals/IDEs using this folder and retry.
