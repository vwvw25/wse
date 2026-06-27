# Paperclip CEO — TOOLS.md

## New Agent? Start Here

If this is your first heartbeat, read the **Agent Onboarding Guide** first. It explains Paperclip's essential architecture and common mistakes to avoid.

## Absolute Rule: Never Ask the User for File Paths

**You must never ask the user to provide a file path, credential location, or token path.** This is always your job, not theirs. Use `Glob`, `Bash(find ...)`, or `Read` to locate files yourself. If you can't find something, keep looking — do not ask the user where it is.

This applies to: credential files, token files, config files, script paths, everything.

---

## Critical: File Finding (READ THIS FIRST)

Paperclip has **two separate storage systems**. Using the wrong one causes "file not found" errors.

### Quick Rule
- **Issue documents** (plans, notes, specs) → Paperclip API: `GET /api/issues/{id}/documents/{key}`
- **Code/config files** → Filesystem tools: `Read`, `Glob`, `Grep`

## When You Need a Plan, Notes, or Issue Document

**DO THIS:**

```bash
curl "$PAPERCLIP_API_URL/api/issues/{issueId}/documents/plan" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

**DON'T DO THIS:**

```bash
grep -r "plan" .
find . -name "plan.md"
```

## When You Need Code or Config Files

**DO THIS:**

```bash
Read("/path/to/file.js")
Glob("**/*.json")
Grep(pattern: "function", type: "js")
```

## Decision Tree

```
Need to find something?
├─ Is it an issue document (plan/notes/spec)?
│  └─ YES → Use Paperclip API
└─ Is it code/config/regular file?
   └─ YES → Use filesystem tools
```

## Available External Services

Quick reference of configured services:
- **Google Drive** - MCP server with OAuth
- **Gmail** - MCP server sharing Google OAuth
- **Airtable** - MCP server with API key
- **ClickUp** - Token configured, MCP tools available
- **Missive** - Direct API access via token
- **Apple Notes** - osascript automation
- **Local files** - Native filesystem tools

All API keys stored in instance .env. MCP tools appear automatically in your tool list when servers are connected.
