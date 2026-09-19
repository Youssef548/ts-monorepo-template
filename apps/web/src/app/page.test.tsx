import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

/**
 * Proves the web seam rather than any feature: the App Router renders a server
 * component under vitest, and `@app/ui` — raw TypeScript from another workspace
 * package — resolves and renders through the Tailwind-token setup.
 */
describe('home page', () => {
  it('renders with the Button primitive from @app/ui', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Primary' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ghost' })).toBeTruthy();
  });
});
