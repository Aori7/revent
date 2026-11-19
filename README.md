<div align="center">

<img src="./frontend-web/public/revent-icon.svg" width="100" alt="REVENT Logo" />

# REVENT

**Bank Smarter. Stay Safer.**

*A smarter banking experience, designed to keep you one step ahead of scams.*

![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)

</div>

---

## About

REVENT is a student-developed digital banking prototype focused on scam prevention, smarter transactions and safer financial decisions. Developed for the Full Stack Development Project (FSDP), it helps users recognise AI-powered scams, build scam awareness and practise safer banking habits.

> This application is an educational simulation. It does not process real banking transactions or issue real vouchers.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Database and authentication | Supabase (PostgreSQL, Supabase Auth) |
| AI scam analysis | IBM watsonx.ai |
| Registration email delivery | Supabase Auth with Mailjet SMTP |

## Setup Instructions

Follow the steps below to run REVENT locally using the existing shared development database.

### 1. Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) and npm (use the team's agreed version; an active LTS release is recommended if no version is specified).
- [Git](https://git-scm.com/).
- [Visual Studio Code](https://code.visualstudio.com/) (recommended).
- Access to this GitHub repository.
- The approved environment configuration for the shared REVENT development database and AI service. Request it privately from the project team before running the application.

Verify that Node.js, npm and Git are installed:

```powershell
node -v
npm -v
git --version
```

### 2. Clone the Repository

Open PowerShell or the VS Code terminal and run:

```powershell
git clone https://github.com/Aori7/revent-simulator.git
cd revent-simulator
code .
```

If the repository URL has changed, copy the current clone URL from GitHub. If you have already cloned the repository, open your existing project folder instead. Use the `main` branch for the integrated version, or the branch specified by the project team for testing.

### 3. Project Structure

```text
revent-simulator/
├── backend/
│   ├── app.js
│   ├── controllers/
│   ├── routes/
│   ├── config/
│   ├── package.json
│   └── .env                 # Local file; never commit
├── frontend-web/
│   ├── public/
│   │   └── rewardImages/     # Voucher artwork
│   ├── src/
│   ├── package.json
│   └── .env                 # Only if required by the frontend
├── supabase/                 # Database migrations, where maintained
└── README.md
```

The tree shows the main setup-related directories rather than every source file. Additional feature-specific folders may be present.

### 4. Install Dependencies

Install the backend and frontend dependencies separately. Run the following commands from the repository root:

```powershell
cd backend
npm install
cd ../frontend-web
npm install
cd ..
```

If the corresponding `package-lock.json` files are present and up to date, `npm ci` can be used instead for a reproducible clean installation. Do not copy `node_modules` from another computer or install each dependency manually.

> **Windows PowerShell:** If npm reports that running scripts is disabled (`npm.ps1 cannot be loaded`), use `npm.cmd install` and `npm.cmd run dev` instead.

### 5. Configure Environment Variables

#### Backend

Create a file named `.env` inside the `backend` directory. It must be next to `app.js`, not in the repository root. Obtain the approved configuration from the team through a secure channel.

The following is an illustrative template, not a verified list of every variable in the current branch. Replace placeholders with the team's values and use the exact names expected by the checked-out code. Never paste actual credentials into this README.

```dotenv
PORT=3000

# Supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_BACKEND_SECRET_KEY

# PIN authentication
PIN_PEPPER=YOUR_EXISTING_SHARED_PIN_PEPPER

# IBM watsonx.ai
IBM_API_KEY=YOUR_IBM_API_KEY
IBM_PROJECT_ID=YOUR_IBM_PROJECT_ID
IBM_WATSONX_URL=YOUR_IBM_WATSONX_URL
IBM_MODEL_ID=YOUR_IBM_MODEL_ID
IBM_REGION=YOUR_IBM_REGION
```

- The Supabase project URL and backend key must belong to the same project.
- The `PIN_PEPPER` must match the existing configured value for the shared development database, or existing PINs may fail verification. Do not invent a different value for each teammate.
- Keep the backend port at `3000` unless the team has deliberately configured a different API endpoint in the frontend.
- Use the IBM values approved for the project's current model and region.
- Check the checked-out branch's `backend/config/supabaseAdmin.js` and other `process.env` references if variable names differ. Earlier configurations used `VITE_SUPABASE_URL` instead of `SUPABASE_URL`; use the name actually read by the current code and the team's supplied configuration.
- Other team features may require additional environment variables. The team's current configuration takes precedence over this template.

#### Frontend (if required)

If the checked-out frontend directly uses a Supabase client, create `.env` inside `frontend-web` with the corresponding **public** configuration:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the public/anon key variable name expected by the frontend code. If the frontend communicates only through the Express API and does not read these variables, this file is unnecessary.

**Never place the Supabase secret/service-role key, PIN pepper, Mailjet secret or IBM API key in a `VITE_` variable. Vite exposes these variables to the browser.**

#### Protect Credentials

Ensure the repository's `.gitignore` excludes local `.env` files and generated dependencies. Safe example files may be committed only if they contain placeholders.

```gitignore
node_modules/
.env
.env.*
!.env.example
```

If a secret was previously committed, ignoring the file does not remove it from Git history. Rotate the exposed credential and coordinate cleanup with the team.

### 6. Connect to Supabase and Email Services

#### Using the existing shared database (recommended for team members and approved reviewers)

The team uses a shared, hosted Supabase project. Once the correct configuration is supplied, the backend connects to this database automatically; no local PostgreSQL installation is needed.

1. Confirm access to the approved development project with the team.
2. Verify the project URL and backend key in `backend/.env`.
3. Use an authorised test account to test registration, login, learning progress and rewards.

Do **not** rerun database creation/seed scripts against the shared project just to start the application. Schema changes, triggers and seed data applied there already affect every connected teammate. Avoid modifying or deleting other users' test data.

#### Creating a separate Supabase project (optional)

A fresh project is needed only for an isolated deployment. It must have the complete current schema, relationships, functions, triggers, permissions, RLS policies and seed data for **all** integrated features. Apply the team's migration scripts in their documented dependency order, then configure authentication and update the local environment files. Do not disable RLS to work around access errors.

The complete migration sequence has not yet been verified in this README. Ask the team for its current migration set before attempting a fresh database installation.

#### Registration and email delivery

The shared Supabase project is configured to use Mailjet SMTP for registration/access-code emails. With the existing shared project, the SMTP configuration is managed in Supabase; each teammate does not need to create a separate Mailjet account or store SMTP secrets in the frontend.

For a new Supabase project, an authorised administrator must configure the verified sender and Mailjet SMTP credentials in Supabase Auth's SMTP settings. Use the project's approved configuration. Never commit Mailjet credentials.

### 7. Run the Application

Both the backend and frontend must be running at the same time. Open two separate terminals in VS Code, starting from the repository root.

#### Terminal 1 — Backend

```powershell
cd backend
node app.js
```

Expected backend address: `http://localhost:3000`

Keep this terminal open while using the application.

#### Terminal 2 — Frontend

```powershell
cd frontend-web
npm run dev
```

Expected frontend address: [http://localhost:5173](http://localhost:5173)

Open the frontend URL in your browser. Confirm that the backend is running before attempting registration or login.

If Vite selects another port because `5173` is occupied, stop the conflicting process and restart Vite, or coordinate the backend CORS and frontend configuration changes with the team.

Stop either development server with `Ctrl+C` in its terminal.

### 8. Verify the Setup

Use authorised test data only. The following is a smoke-test checklist, not a claim that all tests have passed.

- [ ] The frontend opens without a blank screen or console errors.
- [ ] The backend starts without missing-module or environment errors.
- [ ] A test account can register, receive its access-code email and log in with the required credentials.
- [ ] Scam Education learning cards and readiness questions load.
- [ ] Readiness results and learning progress remain after refreshing or logging in again.
- [ ] First-time learning completions update the points balance; reviewing a completed card does not award duplicate points.
- [ ] The rewards catalogue and voucher images load.
- [ ] A test account with sufficient points can redeem a voucher; the balance is debited once and the voucher appears in My Rewards.
- [ ] The redeemed voucher's status persists after refreshing.
- [ ] AI scam analysis works with the configured IBM service, where integrated into the checked-out branch.

Use a dedicated testing account for redemption tests. Do not use real customer details, passwords, banking information or actual financial transactions.

### 9. Troubleshooting

| Problem | Solution |
| --- | --- |
| `Cannot find module ...\\revent-simulator\\app.js` | Run `cd backend` first, then `node app.js`. The entry point is inside the backend folder. |
| `npm is not recognized` | Install Node.js (which includes npm) and reopen the terminal. |
| `npm.ps1 cannot be loaded` | Use `npm.cmd install` or `npm.cmd run dev` in PowerShell. |
| Missing npm dependency | Run `npm install` in the relevant `backend` or `frontend-web` folder. |
| `ERR_CONNECTION_REFUSED` / `Failed to fetch` | Confirm the backend is running on port `3000` and check the terminal for errors. Verify frontend API settings. |
| `EADDRINUSE` | Stop the other process using the required port before starting the server again. |
| Supabase connection or authentication error | Check that `.env` is in the correct directory and the URL/key match the shared project. Restart the backend after editing `.env`. |
| Existing PIN fails | Confirm the team's approved `PIN_PEPPER` is configured. |
| Registration email not received | Check spam/junk, then have the team verify the Supabase Auth logs, Mailjet SMTP configuration and verified sender. |
| Voucher image not displayed | Check that the actual filename and extension in `frontend-web/public/rewardImages/` match the reward's database `image_path` (e.g. `/rewardImages/coffeebean.jpg`). Paths are case-sensitive on many deployment servers. |
| Vite file watcher `EBUSY` | Stop Vite, close the image preview or program locking the file, then run `npm run dev` again. |

### 10. Contributing

Work on your assigned feature branch, not directly on `main`. Before beginning a new task, coordinate with the team and update your branch from the latest integrated code.

```powershell
git status
git fetch origin
git branch --show-current
```

After making and testing changes, stage only the intended files, review the staged changes, commit with a descriptive message and push to your own branch. Create a pull request for review before merging into `main`.

```powershell
git diff --cached
git commit -m "Describe the implemented change"
git push origin HEAD
```

Do not commit `.env`, `node_modules`, credentials, user data or temporary database test records. Store database schema and seed changes in the team's agreed migration location so other developers can reproduce the setup.

---

<div align="center">

*Currently under development*

Developed as an educational FSDP prototype.

</div>
