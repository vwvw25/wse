'use client'

import { useState, useTransition } from 'react'
import type { Client, ClientType } from '@/types/invoice'
import {
  createAndLinkClient,
  linkExistingClient,
  unlinkClient,
  updateLinkedClient,
} from './invoice-actions'

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  direct: 'Direct client',
  agency: 'Agency',
  event_planner: 'Event planner',
}

const inputStyle: React.CSSProperties = {
  height: 32, padding: '0 9px', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'block', marginBottom: 4,
}

// ── Shared client form fields ─────────────────────────────────────────────────
function ClientFormFields({
  name, setName,
  clientType, setClientType,
  email, setEmail,
  phone, setPhone,
  address, setAddress,
  notes, setNotes,
}: {
  name: string; setName: (v: string) => void
  clientType: ClientType; setClientType: (v: ClientType) => void
  email: string; setEmail: (v: string) => void
  phone: string; setPhone: (v: string) => void
  address: string; setAddress: (v: string) => void
  notes: string; setNotes: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={labelStyle}>Type</label>
        <select style={{ ...inputStyle, height: 32 }} value={clientType} onChange={e => setClientType(e.target.value as ClientType)}>
          <option value="direct">Direct client</option>
          <option value="agency">Agency</option>
          <option value="event_planner">Event planner</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Client / agency name" />
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
      </div>
      <div>
        <label style={labelStyle}>Phone</label>
        <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44…" />
      </div>
      <div>
        <label style={labelStyle}>Address</label>
        <textarea
          style={{ ...inputStyle, height: 56, padding: '7px 9px', resize: 'vertical' }}
          value={address} onChange={e => setAddress(e.target.value)}
          placeholder="Street, City, Postcode"
        />
      </div>
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, height: 48, padding: '7px 9px', resize: 'vertical' }}
          value={notes} onChange={e => setNotes(e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.16)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 18px', color: 'var(--text)' }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ── Create & link modal ───────────────────────────────────────────────────────
function CreateClientModal({
  eventId,
  prefill,
  onClose,
}: {
  eventId: string
  prefill: { name: string; clientType: ClientType; email: string }
  onClose: () => void
}) {
  const [name, setName] = useState(prefill.name)
  const [clientType, setClientType] = useState<ClientType>(prefill.clientType)
  const [email, setEmail] = useState(prefill.email)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      await createAndLinkClient(eventId, {
        name: name.trim(),
        client_type: clientType,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      })
      onClose()
    })
  }

  return (
    <Modal title="Create client" onClose={onClose}>
      <ClientFormFields
        name={name} setName={setName}
        clientType={clientType} setClientType={setClientType}
        email={email} setEmail={setEmail}
        phone={phone} setPhone={setPhone}
        address={address} setAddress={setAddress}
        notes={notes} setNotes={setNotes}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} style={{ padding: '7px 16px', fontSize: 13, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font)' }}>Cancel</button>
        <button onClick={handleSave} disabled={!name.trim()} style={{ padding: '7px 16px', fontSize: 13, background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.5, fontFamily: 'var(--font)', fontWeight: 500 }}>Create & link</button>
      </div>
    </Modal>
  )
}

// ── Edit linked client modal ──────────────────────────────────────────────────
function EditClientModal({
  eventId,
  client,
  onClose,
}: {
  eventId: string
  client: Client
  onClose: () => void
}) {
  const [name, setName] = useState(client.name)
  const [clientType, setClientType] = useState<ClientType>(client.client_type)
  const [email, setEmail] = useState(client.email ?? '')
  const [phone, setPhone] = useState(client.phone ?? '')
  const [address, setAddress] = useState(client.address ?? '')
  const [notes, setNotes] = useState(client.notes ?? '')
  const [, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      await updateLinkedClient(eventId, client.id, {
        name: name.trim(),
        client_type: clientType,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      })
      onClose()
    })
  }

  return (
    <Modal title="Edit client" onClose={onClose}>
      <ClientFormFields
        name={name} setName={setName}
        clientType={clientType} setClientType={setClientType}
        email={email} setEmail={setEmail}
        phone={phone} setPhone={setPhone}
        address={address} setAddress={setAddress}
        notes={notes} setNotes={setNotes}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} style={{ padding: '7px 16px', fontSize: 13, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font)' }}>Cancel</button>
        <button onClick={handleSave} disabled={!name.trim()} style={{ padding: '7px 16px', fontSize: 13, background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.5, fontFamily: 'var(--font)', fontWeight: 500 }}>Save</button>
      </div>
    </Modal>
  )
}

// ── Link existing client modal ────────────────────────────────────────────────
function LinkExistingModal({
  eventId,
  allClients,
  onClose,
}: {
  eventId: string
  allClients: Client[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()

  const filtered = allClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function handleLink(clientId: string) {
    startTransition(async () => {
      await linkExistingClient(eventId, clientId)
      onClose()
    })
  }

  return (
    <Modal title="Link existing client" onClose={onClose}>
      <input
        style={{ ...inputStyle, marginBottom: 12 }}
        placeholder="Search clients…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <div style={{ maxHeight: 320, overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '20px 14px', margin: 0, textAlign: 'center' }}>No clients found.</p>
        ) : (
          filtered.map(c => (
            <button
              key={c.id}
              onClick={() => handleLink(c.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                borderBottom: '0.5px solid var(--border)', cursor: 'pointer',
                fontFamily: 'var(--font)', textAlign: 'left',
              }}
            >
              <span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</span>
                {c.email && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{c.email}</span>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 8 }}>{CLIENT_TYPE_LABELS[c.client_type]}</span>
            </button>
          ))
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button onClick={onClose} style={{ padding: '7px 16px', fontSize: 13, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font)' }}>Cancel</button>
      </div>
    </Modal>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ClientLinkSection({
  eventId,
  isAgency,
  agencyName,
  agentName,
  clientEmail,
  linkedClient,
  allClients,
}: {
  eventId: string
  isAgency: boolean
  agencyName: string | null
  agentName: string | null
  clientEmail: string | null
  linkedClient: Client | null
  allClients: Client[]
}) {
  const [modal, setModal] = useState<'create' | 'edit' | 'link' | null>(null)
  const [, startTransition] = useTransition()

  // Pre-fill logic: agency events → agency name + type; direct → booker name + direct type
  const prefill = {
    name: isAgency ? (agencyName ?? agentName ?? '') : (agentName ?? ''),
    clientType: (isAgency ? 'agency' : 'direct') as ClientType,
    email: isAgency ? '' : (clientEmail ?? ''),
  }

  if (linkedClient) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{linkedClient.name}</span>
            <span style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 4,
              background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
              border: '0.5px solid var(--border)',
            }}>
              {CLIENT_TYPE_LABELS[linkedClient.client_type]}
            </span>
            {linkedClient.email && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{linkedClient.email}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setModal('edit')}
              style={{ padding: '4px 10px', fontSize: 12, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-secondary)' }}
            >
              Edit
            </button>
            <button
              onClick={() => startTransition(async () => unlinkClient(eventId))}
              style={{ padding: '4px 10px', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-tertiary)' }}
            >
              Unlink
            </button>
          </div>
        </div>

        {modal === 'edit' && (
          <EditClientModal eventId={eventId} client={linkedClient} onClose={() => setModal(null)} />
        )}
      </>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flex: 1 }}>No client linked.</span>
        <button
          onClick={() => setModal('create')}
          style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          + Create client
        </button>
        {allClients.length > 0 && (
          <button
            onClick={() => setModal('link')}
            style={{ padding: '5px 12px', fontSize: 12, background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text-secondary)' }}
          >
            Link existing
          </button>
        )}
      </div>

      {modal === 'create' && (
        <CreateClientModal eventId={eventId} prefill={prefill} onClose={() => setModal(null)} />
      )}
      {modal === 'link' && (
        <LinkExistingModal eventId={eventId} allClients={allClients} onClose={() => setModal(null)} />
      )}
    </>
  )
}
