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

## Live Demo

Try REVENT directly in your web browser using the hosted application. 

**Website:** 

### Demo Login Credentials

| Credential | Details |
| --- | --- |
| Access Code | 100009 |
| PIN | 123456 |

### How to Access REVENT

1. Open the deployed website using the link above.
2. Enter the demo access code and PIN.
3. Explore the simulated banking, scam education, and rewards features.

Alternatively, register your own account if you would like a separate learning experience.

The demo account is shared, so its learning progress. Use fictional information only and do not enter real banking credentials or sensitive personal data.

> Deployment link and demo credentials will be updated once the hosted application and dedicated demo account are ready.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Database and authentication | Supabase (PostgreSQL, Supabase Auth) |
| AI scam analysis | IBM watsonx.ai |
| Registration email delivery | Supabase Auth with Mailjet SMTP |

### 1. Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) and npm
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/)

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

```text
revent-simulator/
├── .gitignore                       # Excludes credentials and generated files
├── README.md                        # Project overview, demo access and setup guide
│
├── backend/                         
│   ├── app.js                       # Express application entry point and route registration
│   ├── package.json                 # Backend dependencies and scripts
│   ├── .env                         # Local environment variables (not committed)
│   ├── config/                      # External service configuration
│   │   └── supabaseAdmin.js         
│   │
│   ├── controllers/                 # Request validation and API responses
│   │
│   ├── routes/                      # API endpoint definitions        
│   │
│   └── middlewares/                 # Shared request processing and access control
│
└── frontend-web/                    # React and Vite web application
    ├── package.json                 # Frontend dependencies and scripts
    ├── public/                      # Static assets served directly by Vite
    │
    └── src/                         # React source code
        ├── assets/                  # Images, icons and visual resources
        │
        ├── components/              # Reusable user interface components
        │
        ├── css/                     # Feature-specific stylesheets
        │
        ├── data/                    # Frontend content and display metadata
        │
        ├── hooks/                   # Reusable React state and feature logic
        │
        ├── services/                # Frontend API request functions
        │
        └── pages/                   # Application screens and feature routes
        │
        └── utils/                   # Reusable frontend utility functions
        ├── App.jsx                  # Main application and routing
        └── main.jsx                 # React application entry point
    │
    ├── tests/                       # Automated functional tests
    │
    ├── .gitignore
    ├── eslint.config.js             # Code quality and linting configuration
    ├── index.html                   # HTML entry point
    ├── package-lock.json            # Locked dependency versions
    ├── package.json                 # Dependencies and npm scripts
    └── vite.config.js               # Development and build configuration
```

### 4. Install Dependencies

Install the backend and frontend dependencies separately. Run the following commands from the repository root:

```powershell
cd backend
npm install
cd ../frontend-web
npm install
cd ..
```

### 5. Configure Environment Variables

#### Backend

Create a file named `.env` inside the `backend` directory. Obtain the approved configuration from the team through a secure channel.

The following is an illustrative template, not a verified list of every variable in the current branch. Replace placeholders with the team's values and use the exact names expected by the checked-out code. 

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

### 6. Run the Application

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

Stop either development server with `Ctrl+C` in its terminal.

<div align="center">

*Currently under development*

Developed as an educational FSDP prototype.

</div>
