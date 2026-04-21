'use client'

import React, { useState } from 'react'
import type { Musician, OnboardingType } from '@/types/musicians'
import { INSTRUMENTS } from '@/types/musicians'

interface Props {
  token: string
  musician: Musician
  type: OnboardingType
  fieldsRequested: string[]
}

const DIETARY_OPTIONS = [
  { key: 'lactose_intolerant', label: 'Lactose intolerant' },
  { key: 'gluten_intolerant', label: 'Gluten intolerant' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  fontSize: 14,
  boxSizing: 'border-box',
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#374151',
  marginBottom: 5,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 14,
  marginTop: 0,
  paddingBottom: 8,
  borderBottom: '1px solid #e5e7eb',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={sectionTitleStyle as React.CSSProperties}>{children}</p>
}

export default function OnboardingForm({ token, musician, type, fieldsRequested }: Props) {
  const isGeneral = type === 'general'
  const req = new Set(fieldsRequested)

  // Personal / contact
  const [phone, setPhone] = useState(musician.phone ?? '')

  // Address
  const [addrLine1, setAddrLine1] = useState(musician.address_line1 ?? '')
  const [addrLine2, setAddrLine2] = useState(musician.address_line2 ?? '')
  const [addrCity, setAddrCity] = useState(musician.address_city ?? '')
  const [addrCounty, setAddrCounty] = useState(musician.address_county ?? '')
  const [addrPostcode, setAddrPostcode] = useState(musician.address_postcode ?? '')

  // Instruments
  const [primaryInstrument, setPrimaryInstrument] = useState(musician.primary_instrument ?? '')
  const [secondaryInstrument, setSecondaryInstrument] = useState(musician.secondary_instrument ?? '')

  // Dietary
  const [dietary, setDietary] = useState<Set<string>>(new Set(musician.dietary_requirements ?? []))

  // Vehicle
  const [carReg, setCarReg] = useState(musician.car_registration ?? '')
  const [carMake, setCarMake] = useState(musician.car_make ?? '')
  const [carModel, setCarModel] = useState(musician.car_model ?? '')
  const [carColour, setCarColour] = useState(musician.car_colour ?? '')

  // Identity
  const [dob, setDob] = useState(musician.date_of_birth ?? '')
  const [passport, setPassport] = useState(musician.passport_number ?? '')

  // Health
  const [covidVaccinated, setCovidVaccinated] = useState<string>(
    musician.covid_vaccinated === true ? 'yes' : musician.covid_vaccinated === false ? 'no' : '',
  )
  const [covidBooster, setCovidBooster] = useState<string>(
    musician.covid_booster === true ? 'yes' : musician.covid_booster === false ? 'no' : '',
  )

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDietary(key: string) {
    setDietary(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const showPhone = isGeneral || req.has('phone')
  const showAddress = req.has('address')
  const showInstruments = isGeneral
  const showDietary = isGeneral || req.has('dietary_requirements')
  const showVehicle = isGeneral
    ? req.has('car_registration') || req.has('car_make') || req.has('car_model') || req.has('car_colour')
    : req.has('car_registration') || req.has('car_make') || req.has('car_model') || req.has('car_colour')
  const showIdentity = req.has('date_of_birth') || req.has('passport_number')
  const showHealth = req.has('covid_vaccinated') || req.has('covid_booster')

  const showContactSection = showPhone

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const body: Record<string, unknown> = {}

    if (showPhone) body.phone = phone.trim() || null
    if (showAddress) {
      body.address_line1 = addrLine1.trim() || null
      body.address_line2 = addrLine2.trim() || null
      body.address_city = addrCity.trim() || null
      body.address_county = addrCounty.trim() || null
      body.address_postcode = addrPostcode.trim() || null
    }
    if (showInstruments) {
      body.primary_instrument = primaryInstrument || null
      body.secondary_instrument = secondaryInstrument || null
    }
    if (showDietary) body.dietary_requirements = Array.from(dietary)
    if (showVehicle) {
      if (isGeneral || req.has('car_registration')) body.car_registration = carReg.trim() || null
      if (isGeneral || req.has('car_make')) body.car_make = carMake.trim() || null
      if (isGeneral || req.has('car_model')) body.car_model = carModel.trim() || null
      if (isGeneral || req.has('car_colour')) body.car_colour = carColour.trim() || null
    }
    if (req.has('date_of_birth')) body.date_of_birth = dob || null
    if (req.has('passport_number')) body.passport_number = passport.trim() || null
    if (req.has('covid_vaccinated')) body.covid_vaccinated = covidVaccinated === 'yes' ? true : covidVaccinated === 'no' ? false : null
    if (req.has('covid_booster')) body.covid_booster = covidBooster === 'yes' ? true : covidBooster === 'no' ? false : null

    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 600, overflow: 'hidden' }}>
          <div style={{ background: '#111827', padding: '24px 28px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ward Smith Entertainment</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Thanks, {musician.first_name}!</div>
          </div>
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Details received</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              We've saved your information. You don't need to do anything else — we'll be in touch about upcoming engagements.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 16px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: '#111827', borderRadius: '10px 10px 0 0', padding: '24px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ward Smith Entertainment</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
            {isGeneral ? `Welcome, ${musician.first_name}` : `Hi ${musician.first_name} — a few details needed`}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '0 0 10px 10px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', padding: '28px 28px 32px' }}>
          <p style={{ fontSize: 14, color: '#374151', margin: '0 0 24px', lineHeight: 1.6 }}>
            {isGeneral
              ? "Please fill in the details below to complete your profile. This helps us manage bookings efficiently."
              : "We need a few additional details for an upcoming engagement. Please complete the fields below."}
          </p>

          <form onSubmit={handleSubmit}>

            {/* Contact section */}
            {showContactSection && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Contact</SectionTitle>
                {showPhone && (
                  <Field label="Phone number">
                    <input
                      style={inputStyle}
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 07700 900000"
                      required
                    />
                  </Field>
                )}
              </div>
            )}

            {/* Address section */}
            {showAddress && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Address</SectionTitle>
                <Field label="Address line 1">
                  <input style={inputStyle} value={addrLine1} onChange={e => setAddrLine1(e.target.value)} placeholder="e.g. 12 Main Street" required />
                </Field>
                <Field label="Address line 2 (optional)">
                  <input style={inputStyle} value={addrLine2} onChange={e => setAddrLine2(e.target.value)} placeholder="e.g. Flat 3" />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Town / City">
                    <input style={inputStyle} value={addrCity} onChange={e => setAddrCity(e.target.value)} placeholder="e.g. Manchester" required />
                  </Field>
                  <Field label="County (optional)">
                    <input style={inputStyle} value={addrCounty} onChange={e => setAddrCounty(e.target.value)} placeholder="e.g. Greater Manchester" />
                  </Field>
                </div>
                <Field label="Postcode">
                  <input style={{ ...inputStyle, width: 160 }} value={addrPostcode} onChange={e => setAddrPostcode(e.target.value)} placeholder="e.g. M1 1AA" required />
                </Field>
              </div>
            )}

            {/* Instruments section */}
            {showInstruments && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Instruments</SectionTitle>
                <Field label="Primary instrument">
                  <select value={primaryInstrument} onChange={e => setPrimaryInstrument(e.target.value)} style={inputStyle} required>
                    <option value="">— select —</option>
                    {INSTRUMENTS.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Secondary instrument (optional)">
                  <select value={secondaryInstrument} onChange={e => setSecondaryInstrument(e.target.value)} style={inputStyle}>
                    <option value="">— none —</option>
                    {INSTRUMENTS.map(inst => (
                      <option key={inst} value={inst}>{inst}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {/* Dietary section */}
            {showDietary && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Dietary requirements</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {DIETARY_OPTIONS.map(opt => (
                    <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={dietary.has(opt.key)}
                        onChange={() => toggleDietary(opt.key)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle section */}
            {showVehicle && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Vehicle</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {(isGeneral || req.has('car_registration')) && (
                    <Field label="Registration">
                      <input style={inputStyle} value={carReg} onChange={e => setCarReg(e.target.value)} placeholder="e.g. AB12 CDE" required />
                    </Field>
                  )}
                  {(isGeneral || req.has('car_make')) && (
                    <Field label="Make">
                      <input style={inputStyle} value={carMake} onChange={e => setCarMake(e.target.value)} placeholder="e.g. Ford" required />
                    </Field>
                  )}
                  {(isGeneral || req.has('car_model')) && (
                    <Field label="Model">
                      <input style={inputStyle} value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="e.g. Focus" required />
                    </Field>
                  )}
                  {(isGeneral || req.has('car_colour')) && (
                    <Field label="Colour">
                      <input style={inputStyle} value={carColour} onChange={e => setCarColour(e.target.value)} placeholder="e.g. Silver" required />
                    </Field>
                  )}
                </div>
              </div>
            )}

            {/* Identity section */}
            {showIdentity && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Identity</SectionTitle>
                {req.has('date_of_birth') && (
                  <Field label="Date of birth">
                    <input style={inputStyle} type="date" value={dob} onChange={e => setDob(e.target.value)} required />
                  </Field>
                )}
                {req.has('passport_number') && (
                  <Field label="Passport number">
                    <input style={inputStyle} value={passport} onChange={e => setPassport(e.target.value)} placeholder="e.g. 123456789" required />
                  </Field>
                )}
              </div>
            )}

            {/* Health section */}
            {showHealth && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Health</SectionTitle>
                {req.has('covid_vaccinated') && (
                  <Field label="COVID vaccinated">
                    <div style={{ display: 'flex', gap: 20 }}>
                      {['yes', 'no'].map(v => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="covid_vaccinated"
                            value={v}
                            checked={covidVaccinated === v}
                            onChange={() => setCovidVaccinated(v)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                            required={v === 'yes'}
                          />
                          {v === 'yes' ? 'Yes' : 'No'}
                        </label>
                      ))}
                    </div>
                  </Field>
                )}
                {req.has('covid_booster') && (
                  <Field label="COVID booster received">
                    <div style={{ display: 'flex', gap: 20 }}>
                      {['yes', 'no'].map(v => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="covid_booster"
                            value={v}
                            checked={covidBooster === v}
                            onChange={() => setCovidBooster(v)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                            required={v === 'yes'}
                          />
                          {v === 'yes' ? 'Yes' : 'No'}
                        </label>
                      ))}
                    </div>
                  </Field>
                )}
              </div>
            )}

            {error && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: 14, marginBottom: 20 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '13px 0',
                background: '#111827',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit details'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
