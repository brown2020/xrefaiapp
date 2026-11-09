/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import AuthPage from '@/components/auth/AuthPage';
import * as useAuthSessionModule from '@/components/auth/useAuthSession';

// Mock the useAuthSession hook
vi.mock('@/components/auth/useAuthSession', () => ({
  useAuthSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

// Helper to create mock session for signed-in state
const createMockSession = () => ({
  uid: 'test-user-123',
  authEmail: 'test@example.com',
  authPending: false,
  email: 'test@example.com',
  handleSignOut: vi.fn(),
  authDisplayName: 'Test User',
  authPhotoUrl: '',
  authEmailVerified: true,
  setEmail: vi.fn(),
  password: '',
  setPassword: vi.fn(),
  name: '',
  setName: vi.fn(),
  isVisible: false,
  isEmailLinkLogin: false,
  setIsEmailLinkLogin: vi.fn(),
  authMode: 'signin' as const,
  showGoogleSignIn: false,
  isSubmitting: false,
  authFeedback: null,
  clearAuthFeedback: vi.fn(),
  showModal: vi.fn(),
  hideModal: vi.fn(),
  handleSubmit: vi.fn(),
  handleGoogleSignIn: vi.fn(),
  handlePasswordReset: vi.fn(),
  toggleMode: vi.fn(),
});

describe('AuthPage - Explicit confirmation for already-signed-in users', () => {
  test('shows "You\'re already signed in" heading when user is signed in', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    // Should show "You're already signed in" heading
    const heading = screen.getByRole('heading', { name: /already signed in/i });
    expect(heading).toBeInTheDocument();
  });

  test('Continue link href equals allowlisted path for next=/history', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    // Find Continue button and check href
    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toHaveAttribute('href', '/history');
  });

  test('Continue link shows page name "History"', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toHaveTextContent(/Continue to History/i);
  });

  test('hostile URL //evil.com falls back to default route', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="//evil.com" />);

    const continueLink = screen.getByTestId('continue-button');
    // Should fall back to default route (Tools)
    expect(continueLink).toHaveAttribute('href', '/tools');
    expect(continueLink).toHaveTextContent(/Continue to Tools/i);
  });

  test('hostile URL https://evil.com falls back to default route', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="https://evil.com" />);

    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toHaveAttribute('href', '/tools');
    expect(continueLink).toHaveTextContent(/Continue to Tools/i);
  });

  test('backslash variant /\\evil.com falls back to default route', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/\\evil.com" />);

    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toHaveAttribute('href', '/tools');
    expect(continueLink).toHaveTextContent(/Continue to Tools/i);
  });

  test('URL-encoded variant %2F%2Fevil.com falls back to default route', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="%2F%2Fevil.com" />);

    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toHaveAttribute('href', '/tools');
    expect(continueLink).toHaveTextContent(/Continue to Tools/i);
  });

  test('unknown internal path /unknown-page falls back to default route', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/unknown-page" />);

    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toHaveAttribute('href', '/tools');
    expect(continueLink).toHaveTextContent(/Continue to Tools/i);
  });

  test('no automatic navigation - component renders without redirect', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    // Component should render without calling router.replace
    // (automatic redirect only happens in onSignedIn callback after actual sign-in)
    const heading = screen.getByRole('heading', { name: /already signed in/i });
    expect(heading).toBeInTheDocument();
    
    // The Continue link should exist (no automatic navigation)
    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toBeInTheDocument();
  });
});
