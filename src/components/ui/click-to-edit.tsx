import type * as React from 'react'

import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import ContentEditable from 'react-contenteditable'
import useStateRef from 'react-usestateref'

const ClickToEdit = ({
  text,
  textClassName,
  className,
  placeholder,
  onSave,
  ...props
}: {
  text: string
  textClassName?: string
  className?: string
  placeholder?: string
  onSave: (text: string) => void
} & React.HTMLAttributes<HTMLDivElement>) => {
  const [value, setValue, valueRef] = useStateRef(text)
  const contentEditable = useRef<HTMLElement>(null)

  const handleChange = (e: { target: { value: string } }) => {
    setValue(contentEditable.current?.textContent || '')
  }

  const handleBlur = () => {
    const currentValue = valueRef.current
    if (currentValue && currentValue !== text) {
      onSave(currentValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      contentEditable.current?.blur()
    }
  }

  useEffect(() => {
    setValue(text)
  }, [text])

  return (
    <div className={cn('flex items-center gap-2 w-auto', className)}>
      <ContentEditable
        innerRef={contentEditable}
        html={value}
        onChange={handleChange}
        className={cn(
          'flex-1 flex items-center gap-1 group outline-none',
          placeholder &&
            !value &&
            'before:content-[attr(data-placeholder)] before:text-muted-foreground',
          textClassName,
        )}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        {...props}
      />
    </div>
  )
}

ClickToEdit.displayName = 'ClickToEdit'

export { ClickToEdit }
