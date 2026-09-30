import React, { useRef, useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Text } from '../Text'

describe('Text', () => {
  it('renders a span by default', () => {
    render(<Text role="body">Test text</Text>)
    const element = screen.getByText('Test text')
    expect(element.tagName).toBe('SPAN')
  })

  it('renders the requested element via as prop', () => {
    render(<Text role="title" as="h1">Heading</Text>)
    expect(screen.getByText('Heading').tagName).toBe('H1')

    render(<Text role="body" as="p">Paragraph</Text>)
    expect(screen.getByText('Paragraph').tagName).toBe('P')
  })

  it('applies the correct typography class based on role', () => {
    render(<Text role="display">Display</Text>)
    expect(screen.getByText('Display')).toHaveClass('text-display')

    render(<Text role="mono">Monospace</Text>)
    expect(screen.getByText('Monospace')).toHaveClass('text-mono')
  })

  it('appends caller className without duplication', () => {
    render(<Text role="body" className="custom-class">Custom class</Text>)
    const element = screen.getByText('Custom class')
    expect(element).toHaveClass('text-body', 'custom-class')
    expect(element.className).toBe('text-body custom-class')
  })

  it('works without a className prop', () => {
    render(<Text role="caption">No class</Text>)
    expect(screen.getByText('No class')).toHaveClass('text-caption')
    expect(screen.getByText('No class').className).toBe('text-caption')
  })

  it('forwards ref to the rendered DOM node', () => {
    const refCallback = (node: HTMLElement | null) => {
      if (node) {
        expect(node.tagName).toBe('SPAN')
        expect(node.textContent).toBe('Ref test')
      }
    }

    render(<Text role="body" ref={refCallback}>Ref test</Text>)
  })

  it('forwards ref to the rendered DOM node (useRef harness)', () => {
    let capturedRef: HTMLElement | null = null

    const TestComponent = () => {
      const ref = useRef<HTMLElement>(null)
      useEffect(() => {
        capturedRef = ref.current
      }, [])
      return <Text role="body" ref={ref}>UseRef test</Text>
    }

    render(<TestComponent />)
    expect(capturedRef).not.toBeNull()
    expect(capturedRef?.textContent).toBe('UseRef test')
  })

  it('passes through arbitrary HTML attributes', () => {
    render(
      <Text
        role="body"
        id="test-id"
        style={{ color: 'red' }}
        data-testid="text-element"
        aria-label="Test label"
      >
        Attributes test
      </Text>
    )
    const element = screen.getByTestId('text-element')
    expect(element).toHaveAttribute('id', 'test-id')
    expect(element).toHaveStyle('color: rgb(255, 0, 0)')
    expect(element).toHaveAttribute('aria-label', 'Test label')
  })

  describe('Validation & Invariants', () => {
    it('falls back to body role for invalid runtime role', () => {
      // @ts-expect-error Testing invalid runtime input
      render(<Text role="invalid-role" data-testid="invalid-role-test">Invalid role</Text>)
      expect(screen.getByTestId('invalid-role-test')).toHaveClass('text-body')
    })

    it('falls back to span for invalid as component prop', () => {
      // @ts-expect-error Testing invalid runtime input
      render(<Text role="body" as={123} data-testid="invalid-as-test">Invalid as</Text>)
      expect(screen.getByTestId('invalid-as-test').tagName).toBe('SPAN')

      // Testing invalid string for `as`
      // @ts-expect-error Testing invalid runtime input
      render(<Text role="body" as="<script>" data-testid="invalid-as-string-test">Invalid as string</Text>)
      expect(screen.getByTestId('invalid-as-string-test').tagName).toBe('SPAN')
    })

    it('handles undefined className safely', () => {
      render(<Text role="title" className={undefined} data-testid="undefined-class-test">Undefined class</Text>)
      expect(screen.getByTestId('undefined-class-test').className).toBe('text-title')
    })
  })
})
