# AgentDock

**One agent. Multiple interfaces.**

AgentDock is an AI agent interface built with TypeScript and Bun. It brings together interactive terminal workflows and Telegram, with different modes for asking questions, planning tasks, and executing actions.

## Features

- **Interactive CLI** — interact with your AI agent directly from the terminal.
- **Telegram integration** — interact with the agent through Telegram.
- **Agent mode** — execute tasks using AI-powered tools.
- **Plan mode** — create a plan before executing tasks.
- **Ask mode** — ask questions and get explanations without executing tasks.
- **Multiple interfaces** — access the agent through the terminal or Telegram.



## Tech Stack

- Bun
- TypeScript
- Commander.js
- Clack
- OpenRouter
- Firecrawl
- Telegram Bot API



## Prerequisites

Before installing AgentDock, make sure you have:

- [Bun](https://bun.sh/) installed.
- An [OpenRouter API key](https://openrouter.ai/) for AI functionality.
- A [Firecrawl API key](https://www.firecrawl.dev/) for web-search functionality, where required.
- A Telegram bot token and any additional Telegram credentials required by your configuration if you want to use Telegram mode.

> **Note:** AgentDock currently uses Bun to execute its TypeScript entry point. Installing it through npm does not remove the Bun runtime requirement.



## Installation



### Using npm

Install AgentDock globally:

```bash
npm install -g @wishmaster815/agentdock-ai
```



### Using Bun

```bash
bun add -g @wishmaster815/agentdock-ai
```

After installation, launch AgentDock:

```bash
agent-dock
```

You can also explicitly launch the interactive menu:

```bash
agent-dock wakeup
```

Choose the interface and interaction mode you want to use.

## Configuration

AgentDock uses environment variables to configure its AI provider, web tools, and Telegram integration.

### 1. Create your environment file

Create a `.env` file in the working directory from which you run AgentDock.

If you're working from the source repository, copy the example:

```bash
cp .env.example .env
```

If you installed AgentDock globally, create a `.env` file in your working directory or configure the variables in your shell environment.

### 2. Configure your API keys

Add the following variables to your `.env` file:

```dotenv
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=your_openrouter_model

FIRECRAWL_API_KEY=your_firecrawl_api_key

TELEGRAM_API_TOKEN=your_telegram_bot_token
TELEGRAM_USER_TOKEN=your_telegram_user_token
```

Replace the placeholders with your actual credentials and the model identifier supported by your configuration.


| Variable                   | Purpose                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`       | Authenticates requests to OpenRouter                                             |
| `OPENROUTER_DEFAULT_MODEL` | Selects the default AI model                                                     |
| `FIRECRAWL_API_KEY`        | Enables Firecrawl-powered web functionality                                      |
| `TELEGRAM_API_TOKEN`       | Configures Telegram bot access                                                   |
| `TELEGRAM_USER_TOKEN`      | Supplies the additional Telegram user credential expected by your implementation |


Only configure the credentials needed for the interface and features you intend to use.

**Security:** Never commit your `.env` file or publish real API keys. Keep `.env` in your `.gitignore` and use `.env.example` only for placeholder values.

## Development Setup

To work on the source code:

```bash
git clone https://github.com/wishmaster815/AgentDock.git
cd AgentDock

bun install
cp .env.example .env
```

Configure your `.env` file, then start AgentDock:

```bash
bun run index.ts
```

To launch the interactive menu explicitly:

```bash
bun run index.ts wakeup
```



## Modes


| Mode         | Description                                    |
| ------------ | ---------------------------------------------- |
| **Agent**    | Execute tasks using the AI agent and its tools |
| **Plan**     | Plan tasks before execution                    |
| **Ask**      | Ask questions and receive explanations         |
| **CLI**      | Interact with the agent through the terminal   |
| **Telegram** | Interact with the agent through Telegram       |


Available modes and required credentials depend on your configuration.

## Troubleshooting

**AgentDock command not found**

Verify that the global package installation completed successfully and that your package manager's global executable directory is on your `PATH`.

**AI requests fail**

Check your `OPENROUTER_API_KEY`, model identifier, network connection, and provider access.

**Web functionality fails**

Verify your `FIRECRAWL_API_KEY` and ensure your account has access to the required service.

**Telegram mode fails**

Check your Telegram bot token, user credential configuration, and bot permissions.

**Bun is missing**

Install Bun from [bun.sh](https://bun.sh/) before running AgentDock.

## Vision

The goal is to build an extensible agent interface that makes AI-powered workflows accessible directly from the terminal and beyond.

**One agent. Multiple interfaces.**

## Links

- **npm:** [@wishmaster815/agentdock-ai](https://www.npmjs.com/package/@wishmaster815/agentdock)
- **GitHub:** [wishmaster815/AgentDock](https://github.com/wishmaster815/AgentDock)

Contributions, feedback, and ideas are welcome.