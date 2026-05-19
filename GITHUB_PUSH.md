# Push to GitHub (one-time)

The repo is initialized locally on branch `main`. `backend/.env` is **gitignored** (only `.env.example` is committed).

## 1. Log in to GitHub CLI

```powershell
gh auth login
```

Choose: GitHub.com → HTTPS → Yes (authenticate git) → Login with browser.

## 2. Create the repo and push

From `d:\JacHACS`:

```powershell
gh repo create LegalForge-AI --public --source=. --remote=origin --push --description "LegalForge AI — Jac-native multi-agent contract intelligence (JacHacks Spring 2026)"
```

Or if the repo already exists on GitHub:

```powershell
git remote add origin https://github.com/<your-github-username>/LegalForge-AI.git
git push -u origin main
```

## 3. Update README clone URL

Replace `<your-github-username>` in `README.md` with your real GitHub username, then:

```powershell
git add README.md
git commit -m "docs: set GitHub clone URL"
git push
```

## Devpost

Use the new repo URL as **GitHub Project Link** and note: **runs locally only** — judges clone, run `install.ps1`, then `jac serve` + `npm run dev`.
