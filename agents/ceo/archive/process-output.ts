/**
 * Reads Claude Code stream-json from stdin, extracts tool calls and text,
 * groups by issue_id, and writes structured messages to issue_messages.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const envFile = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8')
function getEnv(key: string) {
  const match = envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

type ToolCall = {
  id: string
  name: string
  input: unknown
  output?: string
  success?: boolean
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string }

// Extract issue_id from a curl command string
function extractIssueId(command: string): string | null {
  const patterns = [
    /issues\?id=eq\.([a-f0-9-]{36})/,
    /issues\/([a-f0-9-]{36})/,
    /"issue_id"\s*:\s*"([a-f0-9-]{36})"/,
    /issue_id=([a-f0-9-]{36})/,
  ]
  for (const pattern of patterns) {
    const match = command.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function writeMessage(issueId: string, content: string, toolCalls: ToolCall[]) {
  if (!content.trim() && toolCalls.length === 0) return
  const { error } = await supabase.from('issue_messages').insert({
    issue_id: issueId,
    role: 'agent',
    content: content.trim() || null,
    tool_calls: toolCalls,
  })
  if (error) console.error('[process-output] Failed to write message:', error.message)
  else console.error(`[process-output] Wrote message to issue ${issueId} with ${toolCalls.length} tool calls`)
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })

  // Collect all events
  const toolCallsById: Record<string, ToolCall> = {}
  const allTextBlocks: string[] = []
  const allToolCalls: ToolCall[] = []

  for await (const line of rl) {
    if (!line.trim()) continue
    let event: any
    try { event = JSON.parse(line) } catch { continue }

    if (event.type === 'assistant' && event.message?.content) {
      for (const block of event.message.content as ContentBlock[]) {
        if (block.type === 'text' && block.text.trim()) {
          allTextBlocks.push(block.text)
        }
        if (block.type === 'tool_use') {
          const tc: ToolCall = { id: block.id, name: block.name, input: block.input }
          toolCallsById[block.id] = tc
          allToolCalls.push(tc)
        }
      }
    }

    if (event.type === 'user' && Array.isArray(event.message?.content)) {
      for (const block of event.message.content as ContentBlock[]) {
        if (block.type === 'tool_result') {
          const tc = toolCallsById[block.tool_use_id]
          if (tc) {
            tc.output = block.content
            tc.success = !block.content?.includes('"error"')
          }
        }
      }
    }
  }

  // Group tool calls by issue_id and write a message per issue
  const byIssue: Record<string, ToolCall[]> = {}
  const unattributed: ToolCall[] = []

  for (const tc of allToolCalls) {
    const command = typeof (tc.input as any)?.command === 'string' ? (tc.input as any).command : JSON.stringify(tc.input)
    const issueId = extractIssueId(command)
    if (issueId) {
      if (!byIssue[issueId]) byIssue[issueId] = []
      byIssue[issueId].push(tc)
    } else {
      unattributed.push(tc)
    }
  }

  const fullText = allTextBlocks.join('\n\n')

  // Write per-issue messages
  for (const [issueId, toolCalls] of Object.entries(byIssue)) {
    await writeMessage(issueId, fullText, toolCalls)
  }

  // If no issue-specific messages but there were actions, log as a general note
  if (Object.keys(byIssue).length === 0 && (fullText || unattributed.length > 0)) {
    console.error('[process-output] No issue-specific tool calls found. Output:\n' + fullText)
  }
}

main().catch(console.error)
