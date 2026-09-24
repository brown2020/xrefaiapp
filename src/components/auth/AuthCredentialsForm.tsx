"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockIcon, MailIcon, UserIcon } from "lucide-react";
import { InlineSpinner } from "@/components/ui/LoadingSpinner";
import type { AuthFeedback, useAuthSession } from "@/components/auth/useAuthSession";
import { AuthButton, AuthFeedbackMessage } from "@/components/auth/AuthBits";
import googleLogo from "@/app/assets/google.svg";

type Session = ReturnType<typeof useAuthSession>;

export function AuthCredentialsForm({
  session,
  titleAs: Title = "h2",
}: {
  session: Session;
  /** Use "h1" when the form is the main content of a page. */
  titleAs?: "h1" | "h2";
}) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    isEmailLinkLogin,
    setIsEmailLinkLogin,
    authMode,
    showGoogleSignIn,
    isSubmitting,
    authFeedback,
    clearAuthFeedback,
    signInWithGoogle,
    handlePasswordSubmit,
    handlePasswordReset,
    handleEmailLinkSubmit,
    selectAuthMode,
    isSignup,
    modalTitle,
    modalSubtitle,
  } = session;

  return (
    <form
      onSubmit={isEmailLinkLogin ? handleEmailLinkSubmit : handlePasswordSubmit}
      className="flex flex-col gap-4"
    >
      <div className="pr-10">
        <Title className="text-2xl font-bold">{modalTitle}</Title>
        <p className="mt-1 text-sm text-muted-foreground">{modalSubtitle}</p>
      </div>

      <AuthModeSwitch
        isEmailLinkLogin={isEmailLinkLogin}
        authMode={authMode}
        onSelect={selectAuthMode}
      />
      <AuthFeedbackSlot feedback={authFeedback} />
      <AuthGoogleOption
        showGoogleSignIn={showGoogleSignIn}
        onGoogle={signInWithGoogle}
      />
      <AuthNameField
        show={isSignup || isEmailLinkLogin}
        name={name}
        onNameChange={(value) => {
          setName(value);
          clearAuthFeedback();
        }}
      />
      <AuthEmailField
        email={email}
        onEmailChange={(value) => {
          setEmail(value);
          clearAuthFeedback();
        }}
      />
      <AuthPasswordField
        show={!isEmailLinkLogin}
        authMode={authMode}
        password={password}
        onPasswordChange={(value) => {
          setPassword(value);
          clearAuthFeedback();
        }}
        onReset={handlePasswordReset}
      />
      <AuthSubmitButton
        isEmailLinkLogin={isEmailLinkLogin}
        isSubmitting={isSubmitting}
        authMode={authMode}
        email={email}
        password={password}
      />
      <AuthMethodToggle
        isEmailLinkLogin={isEmailLinkLogin}
        onToggle={() => {
          clearAuthFeedback();
          setIsEmailLinkLogin(!isEmailLinkLogin);
        }}
      />
      <AuthLegalNotice />
    </form>
  );
}

function AuthFeedbackSlot({ feedback }: { feedback: AuthFeedback }) {
  if (!feedback) return null;
  return <AuthFeedbackMessage feedback={feedback} />;
}

function AuthModeSwitch({
  isEmailLinkLogin,
  authMode,
  onSelect,
}: {
  isEmailLinkLogin: boolean;
  authMode: Session["authMode"];
  onSelect: Session["selectAuthMode"];
}) {
  if (isEmailLinkLogin) return null;
  const signInClass =
    authMode === "signin"
      ? "bg-card text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground";
  const signUpClass =
    authMode === "signup"
      ? "bg-card text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground";

  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
      <button
        type="button"
        onClick={() => void onSelect("signin")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30 ${signInClass}`}
        aria-pressed={authMode === "signin"}
      >
        Sign in
      </button>
      <button
        type="button"
        onClick={() => void onSelect("signup")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30 ${signUpClass}`}
        aria-pressed={authMode === "signup"}
      >
        Create account
      </button>
    </div>
  );
}

function AuthGoogleOption({
  showGoogleSignIn,
  onGoogle,
}: {
  showGoogleSignIn: boolean;
  onGoogle: () => void;
}) {
  if (!showGoogleSignIn) return null;
  return (
    <>
      <AuthButton label="Continue with Google" logo={googleLogo} onClick={onGoogle} />
      <div className="flex items-center justify-center w-full">
        <hr className="grow h-px border-0 bg-border" />
        <span className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <hr className="grow h-px border-0 bg-border" />
      </div>
    </>
  );
}

function AuthNameField({
  show,
  name,
  onNameChange,
}: {
  show: boolean;
  name: string;
  onNameChange: (value: string) => void;
}) {
  if (!show) return null;
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        Name <span className="text-muted-foreground">(optional)</span>
      </span>
      <div className="relative mt-1">
        <UserIcon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="auth-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Jane Doe"
          className="input-primary pl-10"
          autoComplete="name"
        />
      </div>
    </label>
  );
}

function AuthEmailField({
  email,
  onEmailChange,
}: {
  email: string;
  onEmailChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">Email</span>
      <div className="relative mt-1">
        <MailIcon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          className="input-primary pl-10"
          autoComplete="email"
          required
        />
      </div>
    </label>
  );
}

function AuthPasswordField({
  show,
  authMode,
  password,
  onPasswordChange,
  onReset,
}: {
  show: boolean;
  authMode: Session["authMode"];
  password: string;
  onPasswordChange: (value: string) => void;
  onReset: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  if (!show) return null;
  const isSignup = authMode === "signup";
  return (
    <>
      <div className="block">
        <label htmlFor="auth-password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative mt-1">
          <LockIcon
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
            className="input-primary pl-10 pr-12"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </div>
      {authMode === "signin" && (
        <div className="-mt-2 text-right">
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
      )}
    </>
  );
}

function AuthSubmitButton({
  isEmailLinkLogin,
  isSubmitting,
  authMode,
  email,
  password,
}: {
  isEmailLinkLogin: boolean;
  isSubmitting: boolean;
  authMode: Session["authMode"];
  email: string;
  password: string;
}) {
  const label = isEmailLinkLogin
    ? "Email me a sign-in link"
    : authMode === "signup"
      ? "Create account"
      : "Sign in";
  const Icon = isEmailLinkLogin ? MailIcon : LockIcon;
  const disabled = isSubmitting || !email || (!isEmailLinkLogin && !password);

  return (
    <button type="submit" className="btn-primary" disabled={disabled}>
      <div className="flex items-center gap-2 h-8">
        {isSubmitting ? <InlineSpinner size="sm" /> : <Icon size={20} />}
        <span>{label}</span>
      </div>
    </button>
  );
}

function AuthMethodToggle({
  isEmailLinkLogin,
  onToggle,
}: {
  isEmailLinkLogin: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="text-center text-sm">
      <button
        type="button"
        onClick={onToggle}
        className="font-medium text-primary hover:underline"
      >
        {isEmailLinkLogin ? "Use password instead" : "Email me a sign-in link instead"}
      </button>
    </div>
  );
}

function AuthLegalNotice() {
  return (
    <p className="text-center text-xs leading-5 text-muted-foreground">
      By continuing, you accept our{" "}
      <Link href="/terms" className="mx-0.5 font-medium text-foreground underline">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="mx-0.5 font-medium text-foreground underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
