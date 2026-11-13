import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import AuthPage from '@/components/auth/AuthPage';
import * as useAuthSessionModule from '@/components/auth/useAuthSession';
import { useAuthStore } from '@/zustand/useAuthStore';

// Mock the useAuthSession hook
vi.mock('@/components/auth/useAuthSession', () => ({
  useAuthSession: vi.fn(),
}));

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

beforeEach(() => {
  router.replace.mockClear();
  router.push.mockClear();
  router.refresh.mockClear();
  useAuthStore.getState().clearAuthDetails();
});

// Helper to create mock session for signed-in state
const createMockSession = () => ({
  uid: 'test-user-123',
  authEmail: 'test@example.com',
  authPending: false,
  sessionReady: false,
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

  test('confirmation panel renders without any client-side navigation', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    const heading = screen.getByRole('heading', { name: /already signed in/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getByTestId('continue-button')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});

// Verified sessions are redirected by the /login and /signup server pages
// (see src/utils/signedInRedirect.test.ts). AuthPage only asks the server to
// re-check once the client has stored a fresh session cookie.
describe('AuthPage - server re-check for a stale session cookie', () => {
  test.each(['signin', 'signup'] as const)(
    '%s: refreshes the server render once after a fresh session cookie is stored',
    async (mode) => {
      vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue({
        ...createMockSession(),
        sessionReady: true,
      });

      const { rerender } = render(<AuthPage mode={mode} next="/history" />);
      rerender(<AuthPage mode={mode} next="/history" />);

      await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
      expect(router.replace).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
      expect(screen.getByTestId('continue-button')).toHaveAttribute('href', '/history');
    }
  );

  test('refreshes once per stored session even when the page remounts', async () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue({
      ...createMockSession(),
      sessionReady: true,
    });

    const first = render(<AuthPage mode="signin" next="/history" />);
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    first.unmount();
    render(<AuthPage mode="signin" next="/history" />);
    render(<AuthPage mode="signup" next="/history" />);

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().sessionRecheckRequested).toBe(true);
  });

  test('does not refresh while a sign-in submit is in flight', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue({
      ...createMockSession(),
      sessionReady: true,
      isSubmitting: true,
    });

    render(<AuthPage mode="signin" next="/history" />);

    expect(router.refresh).not.toHaveBeenCalled();
  });

  test('does not refresh before the session cookie is stored', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    expect(router.refresh).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test.each(['//evil.com', 'https://evil.com', '/\\evil.com', '%2F%2Fevil.com', '/unknown-page'])(
    'unsafe next=%s never reaches the Continue link',
    (next) => {
      vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue({
        ...createMockSession(),
        sessionReady: true,
      });

      render(<AuthPage mode="signin" next={next} />);

      expect(screen.getByTestId('continue-button')).toHaveAttribute('href', '/tools');
      expect(router.replace).not.toHaveBeenCalled();
    }
  );

  test('query string on an allowlisted next is kept on the Continue link', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/payment-success?session_id=cs_test_1" />);

    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toHaveAttribute('href', '/payment-success?session_id=cs_test_1');
    expect(continueLink).toHaveTextContent(/Continue to Payment Success/i);
  });

  test('signed-out user sees the sign-in UI and is neither redirected nor refreshed', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue({
      ...createMockSession(),
      uid: '',
      authEmail: '',
      sessionReady: true,
    });

    render(<AuthPage mode="signin" next="/history" />);

    expect(screen.queryByRole('heading', { name: /already signed in/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('continue-button')).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe('AuthPage - after a sign-in from the form', () => {
  test.each([
    ['/history', '/history'],
    ['/payment-success?session_id=cs_test_1', '/payment-success?session_id=cs_test_1'],
    ['//evil.com', '/tools'],
    ['https://evil.com', '/tools'],
  ])('next=%s loads %s with a full navigation, not a client router replay', (next, expected) => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue({
      ...createMockSession(),
      uid: '',
      authEmail: '',
    });

    render(<AuthPage mode="signin" next={next} />);
    const options = vi.mocked(useAuthSessionModule.useAuthSession).mock.lastCall?.[0];
    act(() => {
      options?.onSignedIn?.();
      options?.onSignedIn?.();
    });

    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(expected);
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText(/Redirecting/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
