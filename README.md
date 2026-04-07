# Schema Viewer

An interactive database schema visualizer that reads `.dbml` files dynamically — inspired by [dbdiagram.io](https://dbdiagram.io), running 100% locally with no external services.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/your-username/schema-viewer.git
cd schema-viewer

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** A local SQLite database (`schema-viewer.db`) is created automatically on first run to persist node positions, notes, and workspaces. This file is excluded from version control (`.gitignore`) but will be generated for you — no setup required.

## Usage

1. Click **Open File** to load a `.dbml` file, or paste DBML content directly into the editor.
2. Explore your schema on the interactive canvas.
3. Click any table to view its columns, relationships, and notes in the side panel.

### Optional: Table Documentation

You can place Markdown files inside a `docs/` folder (one `.md` file per table, named after the table) to display rich documentation in the side panel. This folder is excluded from version control — add your own docs locally.

## Features

- Open a `.dbml` file or paste content directly
- Interactive canvas with drag, zoom, and pan (React Flow)
- Table groups with custom colors
- Foreign key edges with relationship labels
- Side panel with columns, relations, and per-table notes
- Node positions persisted in SQLite (auto-created locally)
- Automatic layout with dagre when no positions are saved
- Table search by name
- Filter by group
- History of the last 5 loaded schemas
- PNG export via `html-to-image`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Canvas | React Flow v12 (`@xyflow/react`) |
| Styles | Tailwind CSS v4 |
| Backend | Express (Node.js + TypeScript) |
| Database | SQLite via `better-sqlite3` |
| DBML Parser | `@dbml/core` v3 |
| Auto Layout | `@dagrejs/dagre` |
| Export | `html-to-image` |

## Project Structure

```
schema-viewer/
├── src/               # React frontend
│   ├── components/    # UI components (canvas nodes, sidebar, panels)
│   └── hooks/         # Custom hooks (parser, layout, API calls)
├── server/
│   ├── index.ts       # Express API (port 3333)
│   └── db.ts          # SQLite setup (auto-creates schema-viewer.db)
├── docs/              # Optional per-table Markdown docs (gitignored)
├── schema.dbml        # Example DBML schema
└── schema-viewer.db   # Local SQLite database (gitignored, auto-created)
```

## License

MIT
