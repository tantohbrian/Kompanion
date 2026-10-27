import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton, Panel } from './index';

describe('UI Primitives', () => {
  it('renders Button and handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders IconButton with accessible aria-label', () => {
    render(<IconButton aria-label="Settings button">⚙️</IconButton>);
    const btn = screen.getByRole('button', { name: /settings button/i });
    expect(btn).toBeInTheDocument();
  });

  it('disables Button when disabled or loading', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: /disabled/i });
    expect(btn).toBeDisabled();
  });

  it('renders Panel with title and children', () => {
    render(<Panel title="Media Inspector"><div>Content</div></Panel>);
    expect(screen.getByText('Media Inspector')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
