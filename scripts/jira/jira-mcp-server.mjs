#!/usr/bin/env node
/**
 * Jira MCP server — exposes Jira tools via Model Context Protocol (JSON-RPC over stdio).
 *
 * Configure in .vscode/mcp.json:
 * {
 *   "servers": {
 *     "jira": {
 *       "type": "stdio",
 *       "command": "node",
 *       "args": ["scripts/jira/jira-mcp-server.mjs"]
 *     }
 *   }
 * }
 *
 * No extra npm packages required — uses Node.js built-ins only.
 */

import { createInterface } from 'node:readline';
import {
  BASE,
  getIssue,
  searchIssues,
  createChildTask,
  assignIssue,
  addComment,
  getTransitions,
  transitionIssue,
  linkIssues,
  findUserByEmail,
  extractText,
} from './jira-client.mjs';

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'jira_get_issue',
    description: 'Get full details of a Jira issue: summary, status, assignee, description, subtasks, parent.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Issue key e.g. PROJ-42' },
      },
      required: ['key'],
    },
  },
  {
    name: 'jira_search',
    description: 'Search Jira issues using JQL. Examples: \'project="PROJ" AND sprint in openSprints()\', \'issuetype=Story AND status="To Do"\'',
    inputSchema: {
      type: 'object',
      properties: {
        jql:   { type: 'string',  description: 'JQL query string' },
        limit: { type: 'number',  description: 'Max results to return (default 30)' },
      },
      required: ['jql'],
    },
  },
  {
    name: 'jira_sprint',
    description: 'List all issues in the current open sprint for a project, ordered by rank.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'Jira project key e.g. PROJ' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'jira_create_task',
    description: 'Create a subtask or child task under an existing Jira issue (HU / Story / Epic).',
    inputSchema: {
      type: 'object',
      properties: {
        parentKey:     { type: 'string', description: 'Parent issue key e.g. PROJ-10' },
        summary:       { type: 'string', description: 'Task title / summary' },
        description:   { type: 'string', description: 'Optional task description' },
        assigneeEmail: { type: 'string', description: 'Optional: email of user to assign' },
      },
      required: ['parentKey', 'summary'],
    },
  },
  {
    name: 'jira_assign',
    description: 'Assign a Jira issue to a team member by their email address.',
    inputSchema: {
      type: 'object',
      properties: {
        key:   { type: 'string', description: 'Issue key e.g. PROJ-10' },
        email: { type: 'string', description: 'Email of the user to assign' },
      },
      required: ['key', 'email'],
    },
  },
  {
    name: 'jira_comment',
    description: 'Add a plain-text comment to a Jira issue.',
    inputSchema: {
      type: 'object',
      properties: {
        key:  { type: 'string', description: 'Issue key' },
        text: { type: 'string', description: 'Comment text' },
      },
      required: ['key', 'text'],
    },
  },
  {
    name: 'jira_transitions',
    description: 'List the available status transitions for a Jira issue (to know what statuses are reachable).',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Issue key' },
      },
      required: ['key'],
    },
  },
  {
    name: 'jira_transition',
    description: 'Move a Jira issue to a new status (e.g. "In Progress", "Done", "In Review").',
    inputSchema: {
      type: 'object',
      properties: {
        key:    { type: 'string', description: 'Issue key' },
        status: { type: 'string', description: 'Target status name (use jira_transitions to see options)' },
      },
      required: ['key', 'status'],
    },
  },
  {
    name: 'jira_link',
    description: 'Link two Jira issues (e.g. "blocks", "is blocked by", "relates to", "duplicates").',
    inputSchema: {
      type: 'object',
      properties: {
        fromKey:  { type: 'string', description: 'Source issue key' },
        linkType: { type: 'string', description: 'Link type name e.g. "Blocks", "Relates"' },
        toKey:    { type: 'string', description: 'Target issue key' },
      },
      required: ['fromKey', 'linkType', 'toKey'],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

async function callTool(name, input) {
  switch (name) {
    case 'jira_get_issue': {
      const issue = await getIssue(input.key);
      const f = issue.fields;
      let out = `**${issue.key}** — ${f.summary}\n`;
      out += `Type: ${f.issuetype?.name ?? '-'} | Status: ${f.status?.name ?? '-'} | Priority: ${f.priority?.name ?? '-'}\n`;
      out += `Assignee: ${f.assignee?.displayName ?? 'Unassigned'}\n`;
      out += `URL: ${BASE}/browse/${issue.key}\n`;
      if (f.parent) out += `Parent: ${f.parent.key} — ${f.parent.fields?.summary ?? ''}\n`;
      if (f.labels?.length) out += `Labels: ${f.labels.join(', ')}\n`;
      const desc = extractText(f.description);
      if (desc) out += `\nDescription:\n${desc.slice(0, 1200)}`;
      if (f.subtasks?.length) {
        out += `\n\nSubtasks (${f.subtasks.length}):\n`;
        for (const s of f.subtasks) {
          out += `  • ${s.key}: ${s.fields.summary} [${s.fields.status?.name ?? '?'}]\n`;
        }
      }
      return out;
    }

    case 'jira_search': {
      const res = await searchIssues(input.jql, input.limit ?? 30);
      let out = `Showing ${res.issues.length} issue(s)${res.isLast ? '' : ' (more available)'}:\n\n`;
      for (const i of res.issues) {
        const f = i.fields;
        out += `**${i.key}** [${f.status?.name ?? '?'}] ${f.summary}`;
        out += ` — ${f.assignee?.displayName ?? 'Unassigned'}\n`;
      }
      return out;
    }

    case 'jira_sprint': {
      const jql = `project = "${input.projectKey}" AND sprint in openSprints() ORDER BY rank ASC`;
      const res = await searchIssues(jql, 100);
      let out = `Open sprint — ${input.projectKey} (${res.issues.length} issues):\n\n`;
      for (const i of res.issues) {
        const f = i.fields;
        out += `**${i.key}** [${f.status?.name ?? '?'}] ${f.summary}`;
        out += ` — ${f.assignee?.displayName ?? 'Unassigned'}\n`;
      }
      return out;
    }

    case 'jira_create_task': {
      let assigneeAccountId;
      if (input.assigneeEmail) {
        const u = await findUserByEmail(input.assigneeEmail);
        if (!u) throw new Error(`User not found with email: ${input.assigneeEmail}`);
        assigneeAccountId = u.accountId;
      }
      const result = await createChildTask({
        parentKey:        input.parentKey,
        summary:          input.summary,
        description:      input.description,
        assigneeAccountId,
      });
      return `Created **${result.key}**: ${input.summary}\nURL: ${BASE}/browse/${result.key}`;
    }

    case 'jira_assign': {
      const u = await findUserByEmail(input.email);
      if (!u) throw new Error(`User not found with email: ${input.email}`);
      await assignIssue(input.key, u.accountId);
      return `Assigned **${input.key}** to ${u.displayName} (${input.email})`;
    }

    case 'jira_comment': {
      await addComment(input.key, input.text);
      return `Comment added to **${input.key}**`;
    }

    case 'jira_transitions': {
      const list = await getTransitions(input.key);
      const lines = list.map(t => `  ${t.id.padEnd(8)} ${t.name}`).join('\n');
      return `Available transitions for **${input.key}**:\n${lines}`;
    }

    case 'jira_transition': {
      await transitionIssue(input.key, input.status);
      return `Transitioned **${input.key}** → "${input.status}"`;
    }

    case 'jira_link': {
      await linkIssues(input.fromKey, input.linkType, input.toKey);
      return `Linked: **${input.fromKey}** [${input.linkType}] **${input.toKey}**`;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── MCP JSON-RPC stdio loop ───────────────────────────────────────────────────

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (raw) => {
  const line = raw.trim();
  if (!line) return;

  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  const { id, method, params } = msg;

  try {
    if (method === 'initialize') {
      send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'jira-mcp', version: '1.0.0' },
        },
      });

    } else if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });

    } else if (method === 'tools/call') {
      const text = await callTool(params.name, params.arguments ?? {});
      send({
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text }] },
      });

    } else if (method?.startsWith('notifications/')) {
      // fire-and-forget, no response required

    } else {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (err) {
    send({
      jsonrpc: '2.0', id,
      result: { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true },
    });
  }
});
