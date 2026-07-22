'use client'

import { useRef } from 'react'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

// Clicking anywhere in the box focuses the first segment and opens the native
// picker, instead of just placing the cursor wherever the click landed.
export default function DateInput({ value, onChange, name, required, disabled, className, style }: DateInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  function handleMouseDown(e: React.MouseEvent<HTMLInputElement>) {
    if (disabled) return
    e.preventDefault()
    const el = ref.current
    if (!el) return
    el.focus()
    el.showPicker?.()
  }

  return (
    <input
      ref={ref}
      type="date"
      name={name}
      required={required}
      disabled={disabled}
      value={value}
      onChange={e => onChange(e.target.value)}
      onMouseDown={handleMouseDown}
      className={className}
      style={{
        ...style,
        cursor: 'pointer',
        // The dd/mm/yyyy placeholder renders using this input's own `color` —
        // dim it until a real value is set, then use the caller's colour.
        color: value ? (style?.color ?? 'var(--text)') : 'var(--text-tertiary)',
      }}
    />
  )
}
