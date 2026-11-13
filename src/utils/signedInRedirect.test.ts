import { isValidElement, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import LoginPage from '@/app/login/page';
import SignupPage from '@/app/signup/page';
import AuthPage from '@/components/auth/AuthPage';

const auth = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  adminConfigured: true,
  verifyIdToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'xrefAuthToken' && auth.cookie !== undefined ? { name, value: auth.cookie } : undefined,
  }),
}));

vi.mock('@/firebase/firebaseAdmin', () => ({
  isAdminConfigured: () => auth.adminConfigured,
  adminAuth: { verifyIdToken: auth.verifyIdToken },
}));

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  })
);

vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const pages = [
  ['/login', LoginPage, 'signin'],
  ['/signup', SignupPage, 'signup'],
] as const;

function tokenError(code: string) {
  return Object.assign(new Error(code), { code });
}

function verifiedToken(signInProvider = 'password') {
  return {
    uid: 'user-123',
    email: 'ada@example.com',
    email_verified: true,
    firebase: { sign_in_provider: signInProvider },
  };
}

async function renderPage(
  page: (typeof pages)[number][1],
  query: Record<string, string> = {}
): Promise<ReactElement<{ mode: string; next: string }>> {
  const element = await page({ searchParams: Promise.resolve(query) });
  if (!isValidElement<{ mode: string; next: string }>(element)) {
    throw new Error('page did not render an element');
  }
  return element;
}

beforeEach(() => {
  auth.cookie = undefined;
  auth.adminConfigured = true;
  auth.verifyIdToken.mockReset();
  redirect.mockClear();
  vi.stubEnv('NEXT_PUBLIC_COOKIE_NAME', 'xrefAuthToken');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(pages)('%s for a visitor with a verified session', (_path, page) => {
  beforeEach(() => {
    auth.cookie = 'header.payload.signature';
    auth.verifyIdToken.mockResolvedValue(verifiedToken());
  });

  test('next=/history redirects to /history on the server', async () => {
    await expect(renderPage(page, { next: '/history' })).rejects.toThrow('NEXT_REDIRECT:/history');
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/history');
    expect(auth.verifyIdToken).toHaveBeenCalledWith('header.payload.signature', true);
  });

  test.each(['//evil.com', 'https://evil.com', '/\\evil.com', '%2F%2Fevil.com', '/unknown-page', ''])(
    'unsafe next=%s redirects to /tools',
    async (next) => {
      await expect(renderPage(page, { next })).rejects.toThrow('NEXT_REDIRECT:/tools');
      expect(redirect).toHaveBeenCalledWith('/tools');
      expect(redirect).not.toHaveBeenCalledWith(expect.stringContaining('evil'));
    }
  );

  test('missing next redirects to /tools', async () => {
    await expect(renderPage(page)).rejects.toThrow('NEXT_REDIRECT:/tools');
  });

  test.each(['/payment-success?session_id=cs_test_1', '/history?page=2#top'])(
    'query string on next=%s is kept',
    async (next) => {
      await expect(renderPage(page, { next })).rejects.toThrow(`NEXT_REDIRECT:${next}`);
      expect(redirect).toHaveBeenCalledWith(next);
    }
  );

  test.each(['google.com', 'emailLink'])('%s sessions are redirected', async (provider) => {
    auth.verifyIdToken.mockResolvedValue(verifiedToken(provider));
    await expect(renderPage(page, { next: '/history' })).rejects.toThrow('NEXT_REDIRECT:/history');
  });
});

describe.each(pages)('%s for a visitor without a verified session', (_path, page, mode) => {
  async function expectForm(query: Record<string, string> = { next: '/history' }) {
    const element = await renderPage(page, query);
    expect(redirect).not.toHaveBeenCalled();
    expect(element.type).toBe(AuthPage);
    expect(element.props).toEqual({ mode, next: query.next ? '/history' : '/tools' });
  }

  test('no cookie renders the form without calling the Admin SDK', async () => {
    await expectForm();
    expect(auth.verifyIdToken).not.toHaveBeenCalled();
  });

  test.each([
    'auth/id-token-expired',
    'auth/id-token-revoked',
    'auth/invalid-id-token',
    'auth/user-disabled',
    'auth/user-not-found',
  ])('a cookie rejected with %s renders the form', async (code) => {
    auth.cookie = 'header.payload.signature';
    auth.verifyIdToken.mockRejectedValue(tokenError(code));
    await expectForm();
  });

  test('an anonymous-provider token renders the form', async () => {
    auth.cookie = 'header.payload.signature';
    auth.verifyIdToken.mockResolvedValue(verifiedToken('anonymous'));
    await expectForm();
  });

  test('an unverifiable cookie renders the form when Admin is not configured, even with the unverified-cookie flag', async () => {
    vi.stubEnv('ALLOW_UNVERIFIED_SESSION_COOKIE', 'true');
    auth.adminConfigured = false;
    auth.cookie = 'header.payload.signature';
    await expectForm();
    expect(auth.verifyIdToken).not.toHaveBeenCalled();
  });

  test('a verification outage renders the form and logs', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.cookie = 'header.payload.signature';
    auth.verifyIdToken.mockRejectedValue(new Error('ECONNRESET'));
    await expectForm();
    expect(consoleError).toHaveBeenCalledWith('Signed-in check failed:', expect.any(Error));
    consoleError.mockRestore();
  });
});
