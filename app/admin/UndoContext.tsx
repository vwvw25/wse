'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export type UndoAction = {
  label: string
  perform: () => Promise<void>
}

type UndoContextType = {
  lastAction: UndoAction | null
  register: (action: UndoAction) => void
  undo: () => Promise<void>
  clear: () => void
}

const UndoContext = createContext<UndoContextType>({
  lastAction: null,
  register: () => {},
  undo: async () => {},
  clear: () => {},
})

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [lastAction, setLastAction] = useState<UndoAction | null>(null)
  const undoing = useRef(false)

  const register = useCallback((action: UndoAction) => {
    setLastAction(action)
  }, [])

  const undo = useCallback(async () => {
    if (!lastAction || undoing.current) return
    undoing.current = true
    try {
      await lastAction.perform()
      setLastAction(null)
    } finally {
      undoing.current = false
    }
  }, [lastAction])

  const clear = useCallback(() => setLastAction(null), [])

  return (
    <UndoContext.Provider value={{ lastAction, register, undo, clear }}>
      {children}
    </UndoContext.Provider>
  )
}

export function useUndo() {
  return useContext(UndoContext)
}

export function UndoButton() {
  const { lastAction, undo } = useUndo()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleUndo() {
    setBusy(true)
    setOpen(false)
    await undo()
    setBusy(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="History"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', width: 32, height: 32, borderRadius: 6,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 8a5.5 5.5 0 1 0 1.1-3.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M2.5 4v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 100,
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '4px 0', minWidth: 200,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            marginTop: 4,
          }}>
            <div style={{ padding: '4px 12px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>History</div>
            <button
              onClick={lastAction && !busy ? handleUndo : undefined}
              disabled={!lastAction || busy}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '7px 12px', border: 'none',
                background: 'transparent', textAlign: 'left',
                fontSize: 13, fontFamily: 'var(--font)',
                color: lastAction ? 'var(--text)' : 'var(--text-tertiary)',
                cursor: lastAction && !busy ? 'pointer' : 'default',
                opacity: busy ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (lastAction) e.currentTarget.style.background = 'var(--bg-secondary)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 6.5a4.5 4.5 0 1 0 .9-2.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M2 3.5v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {lastAction ? `Undo ${lastAction.label}` : 'Nothing to undo'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
