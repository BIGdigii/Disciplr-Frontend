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

  it('combines typography role with multiple extra classes', () => {
    render(<Text role="body" className="font-bold underline text-accent">Styled</Text>)
    const element = screen.getByText('Styled')
    expect(element).toHaveClass('text-body', 'font-bold', 'underline', 'text-accent')
    expect(element.className).toBe('text-body font-bold underline text-accent')
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
})
