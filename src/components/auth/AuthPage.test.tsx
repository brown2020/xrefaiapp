import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import AuthPage from '@/components/auth/AuthPage';
import * as useAuthSessionModule from '@/components/auth/useAuthSession';

// Mock the useAuthSession hook
vi.mock('@/components/auth/useAuthSession', () => ({
  useAuthSession: vi.fn(),
}));

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

beforeEach(() => {
  router.replace.mockClear();
  router.push.mockClear();
});

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

  test('confirmation panel stays rendered as a fallback while the redirect runs', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    const heading = screen.getByRole('heading', { name: /already signed in/i });
    expect(heading).toBeInTheDocument();
    
    // The Continue link stays available in case navigation is slow or blocked
    const continueLink = screen.getByTestId('continue-button');
    expect(continueLink).toBeInTheDocument();
  });
});

describe('AuthPage - automatic redirect for already-signed-in users', () => {
  test('signed-in user with next=/history is redirected to /history', async () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/history" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/history'));
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('continue-button')).toHaveAttribute('href', '/history');
  });

  test('signed-in user on /signup with next=/history is redirected to /history', async () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signup" next="/history" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/history'));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  test.each(['//evil.com', 'https://evil.com', '/\\evil.com', '%2F%2Fevil.com', '/unknown-page'])(
    'signed-in user with unsafe next=%s is redirected to the default route',
    async (next) => {
      vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

      render(<AuthPage mode="signin" next={next} />);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/tools'));
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).not.toHaveBeenCalledWith(expect.stringContaining('evil'));
    }
  );

  test('query string on an allowlisted next is preserved', async () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue(createMockSession());

    render(<AuthPage mode="signin" next="/payment-success?session_id=cs_test_1" />);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/payment-success?session_id=cs_test_1')
    );
    expect(screen.getByTestId('continue-button')).toHaveTextContent(/Continue to Payment Success/i);
  });

  test('signed-out user is not redirected', () => {
    vi.mocked(useAuthSessionModule.useAuthSession).mockReturnValue({
      ...createMockSession(),
      uid: '',
      authEmail: '',
    });

    render(<AuthPage mode="signin" next="/history" />);

    expect(router.replace).not.toHaveBeenCalled();
  });
});
