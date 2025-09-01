'use client'

import { forwardRef, useState, useEffect } from 'react'

interface FloatingLabelInputProps {
  id: string
  name: string
  type?: string
  placeholder?: string
  label: string
  required?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  className?: string
  autoComplete?: string
  pattern?: string
  maxLength?: number
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'search'
  'aria-required'?: boolean
  'aria-describedby'?: string
  error?: string
  isValid?: boolean
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({
    id,
    name,
    type = 'text',
    placeholder = ' ',
    label,
    required = false,
    value = '',
    onChange,
    onBlur,
    onFocus,
    className = '',
    autoComplete,
    pattern,
    maxLength,
    inputMode,
    'aria-required': ariaRequired,
    'aria-describedby': ariaDescribedby,
    error,
    isValid = false,
    icon,
    rightIcon,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasValue, setHasValue] = useState(false)

    useEffect(() => {
      setHasValue(value !== '' && value !== undefined)
    }, [value])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value !== '')
      onChange?.(e)
    }

    const baseInputClasses = `
      w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl
      sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]
      ${icon ? 'pl-9' : 'px-9'}
      ${rightIcon ? 'pr-17' : ''}
      ${error ? 'border-red-500' : isValid ? 'border-green-500' : 'border-[#CDCDCD]'}
      ${className}
    `

    const labelClasses = `
      floating-label bg-transparent absolute pointer-events-none left-9 top-1/2 
      transform -translate-y-1/2 transition-all duration-200 ease-in-out
      ${isFocused || hasValue 
        ? 'text-[1.2rem] text-[#976987] -translate-y-[2.2rem] translate-x-0' 
        : 'text-[1.94rem] sm:text-[1.94rem] text-[2.6rem] text-[#666666]'
      }
      ${error ? 'text-red-500' : ''}
    `

    return (
      <div className="floating-label-group relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={baseInputClasses}
          autoComplete={autoComplete}
          pattern={pattern}
          maxLength={maxLength}
          inputMode={inputMode}
          aria-required={ariaRequired || required}
          aria-describedby={ariaDescribedby}
          {...props}
        />
        
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>

        {rightIcon && (
          <div className="absolute right-9 top-1/2 transform -translate-y-1/2">
            {rightIcon}
          </div>
        )}

        {error && (
          <div 
            id={`${id}-error`}
            className="text-2xl mt-2 error-message"
            style={{ color: '#dc2626' }}
          >
            {error}
          </div>
        )}
      </div>
    )
  }
)

FloatingLabelInput.displayName = 'FloatingLabelInput'

interface FloatingLabelSelectProps {
  id: string
  name: string
  label: string
  required?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void
  className?: string
  autoComplete?: string
  'aria-required'?: boolean
  'aria-describedby'?: string
  error?: string
  isValid?: boolean
  children: React.ReactNode
}

export const FloatingLabelSelect = forwardRef<HTMLSelectElement, FloatingLabelSelectProps>(
  ({
    id,
    name,
    label,
    required = false,
    value = '',
    onChange,
    onBlur,
    onFocus,
    className = '',
    autoComplete,
    'aria-required': ariaRequired,
    'aria-describedby': ariaDescribedby,
    error,
    isValid = false,
    children,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasValue, setHasValue] = useState(false)

    useEffect(() => {
      setHasValue(value !== '' && value !== undefined)
    }, [value])

    const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setHasValue(e.target.value !== '')
      onChange?.(e)
    }

    const baseSelectClasses = `
      w-full border-2 border-[#CDCDCD] px-9 py-7 focus:outline-0 rounded-xl
      sm:text-[1.94rem] text-[2.6rem] text-[#666666] leading-none bg-[#F9F9F9]
      appearance-none bg-no-repeat form-select
      ${error ? 'border-red-500' : isValid ? 'border-green-500' : 'border-[#CDCDCD]'}
      ${className}
    `

    const labelClasses = `
      floating-label bg-transparent absolute pointer-events-none left-9 top-1/2 
      transform -translate-y-1/2 transition-all duration-200 ease-in-out
      ${isFocused || hasValue 
        ? 'text-[1.2rem] text-[#976987] -translate-y-[2.2rem] translate-x-0' 
        : 'text-[1.94rem] sm:text-[1.94rem] text-[2.6rem] text-[#666666]'
      }
      ${error ? 'text-red-500' : ''}
    `

    return (
      <div className="floating-label-group relative">
        <select
          ref={ref}
          id={id}
          name={name}
          required={required}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={baseSelectClasses}
          autoComplete={autoComplete}
          aria-required={ariaRequired || required}
          aria-describedby={ariaDescribedby}
          {...props}
        >
          {children}
        </select>
        
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>

        {error && (
          <div 
            id={`${id}-error`}
            className="text-2xl mt-2 error-message"
            style={{ color: '#dc2626' }}
          >
            {error}
          </div>
        )}
      </div>
    )
  }
)

FloatingLabelSelect.displayName = 'FloatingLabelSelect'
