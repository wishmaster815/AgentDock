# AgentDock

AgentDock is the MVP version of **ClawCode**, an AI agent interface designed to work through the CLI and Telegram.

It provides different modes depending on how you want the agent to interact with a task.

## Features

* CLI interface
* Telegram interface
* Agent mode for executing tasks
* Plan mode for planning before execution
* Ask mode for questions and explanations
* Switch between different interaction modes

## Tech Stack

* Bun
* TypeScript
* Commander.js
* Telegram Bot API
* LLM APIs

## Getting Started

```bash
git clone <repository-url>
cd agent-dock
bun install
bun run dev
```

Start AgentDock:

```bash
agent-dock wakeup
```

Choose the interface and mode you want to use.

## Modes

| Mode     | Description                                  |
| -------- | -------------------------------------------- |
| Agent    | Execute tasks using the AI agent             |
| Plan     | Create a plan before taking action           |
| Ask      | Ask questions without executing tasks        |
| CLI      | Interact with the agent through the terminal |
| Telegram | Interact with the agent through Telegram     |

## Vision

AgentDock is the foundation for ClawCode — a flexible AI agent that can be accessed from different interfaces and operate in different modes.

**One agent. Multiple interfaces.**
