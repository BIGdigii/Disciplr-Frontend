import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByText('No results')).toBeTruthy();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('renders action button and handles click', () => {
    const fn = vi.fn();
    render(<EmptyState title="Empty" action={{ label: 'Reset', onClick: fn }} />);
    fireEvent.click(screen.getByText('Reset'));
    expect(fn).toHaveBeenCalled();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('Nothing here')).toBeNull();
  });

  it('renders button with explicit type="button"', () => {
    render(<EmptyState title="Empty" action={{ label: 'Reset', onClick: () => {} }} />);
    const button = screen.getByRole('button', { name: 'Reset' });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('does not trigger form submit when rendered inside a form and clicked', () => {
    const handleSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const handleClick = vi.fn();
    
    render(
      <form onSubmit={handleSubmit}>
        <EmptyState title="Empty" action={{ label: 'Reset', onClick: handleClick }} />
      </form>
    );

    const button = screen.getByRole('button', { name: 'Reset' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
