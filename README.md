# On-Call Agent MVP

An AI-powered assistant that automatically investigates deployment failures and production issues. When your deployments fail, the agent analyzes the error, searches for solutions, examines your codebase, and provides actionable fix suggestions—all in real-time.

## What It Does

Instead of manually debugging deployment failures, On-Call Agent:
- 🔍 Analyzes error messages and deployment logs
- 📚 Reviews your recent code changes and commits
- 🌐 Searches the web for similar issues and solutions
- 🤖 Uses AI to identify root causes and suggest fixes
- ⚡ Provides real-time updates via WebSocket

Perfect for catching issues before they reach production or quickly diagnosing problems when they do.

## Features

- **Automatic Railway Monitoring**: Continuously monitors Railway deployments every 60 seconds and auto-triggers investigations on failures
- **GitHub Integration**: Fetches commits, diffs, and repository context automatically
- **AI-Powered Analysis**: Uses Claude AI to understand complex errors and suggest fixes
- **Web Search**: Leverages Parallel AI to find solutions from across the internet
- **Documentation Context**: Upload your project docs to help the agent understand your codebase
- **Real-Time Updates**: Watch investigations progress in real-time via WebSocket
- **Actionable Suggestions**: Get specific code fixes, not just generic advice

## Quick Start

### Prerequisites

- Python 3.8+ and Node.js 18+
- API Keys:
  - [Anthropic API Key](https://console.anthropic.com/) (required)
  - [Parallel AI API Key](https://parallel.ai/) (required)
  - [Railway API Key](https://railway.app/account/tokens) (required for automatic monitoring)
  - [GitHub Personal Access Token](https://github.com/settings/tokens) (optional but recommended)

### Backend Setup

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Create .env file
cat > .env << EOF
ANTHROPIC_API_KEY=your_anthropic_key
PARALLEL_AI_API_KEY=your_parallel_key
RAILWAY_API_KEY=your_railway_api_key
GITHUB_ACCESS_TOKEN=your_github_token  # Optional but recommended
EOF

# Run the backend
python main.py
```

Backend runs on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000`

## Usage

### 1. Connect Your Repository

Navigate to `/setup` and:
1. Enter your repository owner and name (e.g., `yourusername/my-repo`)
2. **Railway Project Name** (for automatic monitoring): Enter your Railway project name to enable automatic deployment monitoring. The system will check deployment status every 60 seconds and automatically trigger investigations when deployments fail.
3. Optionally upload documentation (README, API docs, etc.) to help the agent understand your project
4. Click "Connect Repository"

> **Note**: With Railway project name configured, the agent automatically monitors your deployments in the background. Failed or crashed deployments will trigger investigations automatically—no manual intervention needed!

### 2. Start an Investigation

When a deployment fails or you encounter an error:

1. Go to `/investigate`
2. Enter:
   - **Repository ID**: Found in the dashboard or backend console
   - **Error Message**: Describe what went wrong
   - **Deployment Logs**: Paste the error output (optional but recommended)
   - **Commit SHA**: The commit that likely caused the issue (optional)
3. Click "Start Investigation"

The agent will automatically:
- Fetch recent commits and diffs from GitHub
- Search the web for similar errors and solutions
- Analyze your codebase and documentation
- Generate a root cause analysis with fix suggestions

### 3. Review Results

View real-time investigation progress and results on the investigation detail page. Each investigation includes:
- Root cause analysis
- Specific fix suggestions with code examples
- Recommended actions (revert commit, apply patch, etc.)

## Example Investigation

**Input:**
```
Error Message: Deployment failed: Cannot read property 'create' of undefined
Deployment Logs: 
  at src/payments.js:45
  error: stripe.paymentIntents.create is not a function
```

**Agent Output:**
- Identifies the issue: Stripe SDK not properly initialized
- Searches web: Finds similar issues and solutions
- Analyzes code: Reviews your Stripe integration code
- Suggests fix: Shows exact code changes needed to initialize Stripe correctly

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   GitHub    │──────│              │──────│   Claude    │
│  Repository │      │              │      │     AI      │
└─────────────┘      │   On-Call    │      └─────────────┘
                     │    Agent     │
┌─────────────┐      │              │      ┌─────────────┐
│   Railway   │◄─────┤  (monitors   │──────│  Parallel   │
│  Deployments│ 60s  │   every 60s) │      │     AI      │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            │
                     ┌──────▼─────────┐
                     │    SQLite      │
                     │    Database    │
                     └────────────────┘
```

The backend uses FastAPI with async investigation tasks and a background monitoring service that checks Railway deployments every 60 seconds. When a deployment fails, it automatically triggers an investigation. The frontend provides a modern Next.js interface for monitoring repositories, viewing investigations, and manually triggering investigations.

## Current Status

**✅ Fully Working:**
- Repository connection and management
- Document upload and processing
- **Automatic Railway deployment monitoring** (checks every 60 seconds)
- Automatic investigation triggering on deployment failures
- Manual investigation triggering
- AI-powered analysis with Claude + Parallel AI
- Real-time investigation updates
- Results visualization

**🚧 Planned Features:**
- Automated fix application (revert commits, create PRs)
- Multi-repository dashboard improvements
- Enhanced Railway deployment metadata integration
- Deployment monitoring for frontend on platforms like netlify and support for other backend hosting platforms too.

The system now automatically monitors Railway deployments and triggers investigations when failures are detected. You can also manually trigger investigations for testing or non-Railway deployments.

## Project Structure

```
oncall-agent-mvp/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # SQLAlchemy models
│   ├── agent/
│   │   └── investigator.py  # Claude AI integration
│   └── integrations/
│       ├── github.py        # GitHub API client
│       ├── parallel_ai.py   # Parallel AI client
│       └── railway.py       # Railway API client
├── frontend/
│   └── app/
│       ├── page.tsx         # Dashboard
│       ├── setup/           # Repository setup
│       ├── investigate/     # Start investigations
│       └── investigation/   # View results
└── README.md
```

## API Reference

**Repositories:**
- `POST /api/repositories` - Connect a repository
- `GET /api/repositories` - List all repositories
- `GET /api/repositories/{id}` - Get repository details
- `POST /api/repositories/{id}/documents` - Upload documentation

**Investigations:**
- `POST /api/repositories/{id}/investigate` - Start an investigation
- `GET /api/investigations` - List all investigations
- `GET /api/investigations/{id}` - Get investigation results
- `WS /ws/investigation/{id}` - Real-time updates via WebSocket

## Troubleshooting

**Backend won't start:**
- Verify all environment variables are set in `.env`
- Ensure virtual environment is activated
- Check if port 8000 is available

**Frontend can't connect:**
- Confirm backend is running on `http://localhost:8000`
- Check browser console for CORS errors

**Investigations fail:**
- Validate API keys are correct and have sufficient credits
- Ensure repository is accessible with your GitHub token
- Check backend logs for detailed error messages

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **AI**: Claude (Anthropic SDK)
- **Search**: Parallel AI
- **Integrations**: GitHub API, Railway API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
