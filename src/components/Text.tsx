import React from 'react'
import { getTypographyClass } from '../utils/typography'
import type { TypographyRole } from '../utils/typography'

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /** Typography role determining size and weight */
  role: TypographyRole
  /** HTML element to render as (default: 'span') */
  as?: keyof JSX.IntrinsicElements
  /** Child content */
  children: React.ReactNode
}

const VALID_ROLES = new Set<TypographyRole>(['display', 'title', 'subtitle', 'body', 'caption', 'mono'])

/**
 * Text component for applying consistent typography scales
 * 
 * Automatically handles responsive sizing across sm/md/lg breakpoints.
 * Uses CSS variables that update based on viewport width.
 * 
 * @example
 * <Text role="display">Hero headline</Text>
 * <Text role="body" as="p">Body paragraph</Text>
 * <Text role="caption">Small helper text</Text>
 */
export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ role, as: Component = 'span', className, ...props }, ref) => {
    // Validation invariant: Fall back to 'body' if an invalid role is provided at runtime
    const safeRole = VALID_ROLES.has(role) ? role : 'body'
    
    // Validation invariant: Ensure the component is a valid element string
    const safeComponent = typeof Component === 'string' && /^[a-zA-Z0-9-]+$/.test(Component) ? Component : 'span'

    const typographyClass = getTypographyClass(safeRole)
    const mergedClassName = className
      ? `${typographyClass} ${className}`
      : typographyClass

    return React.createElement(safeComponent as React.ElementType, {
      ref,
      className: mergedClassName,
      ...props,
    })
  }
)

Text.displayName = 'Text'
