'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import type { ZodTypeAny } from 'zod';
import { Check, ChevronLeft, CircleCheck, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { FieldError, FormError, TextField } from '@/components/app/fields';
import { OtpInput } from '@/components/app/otp-input';
import { cx, PillButton } from '@/components/app/primitives';
import { useToast } from '@/components/app/toast';
import { api, ApiClientError, errorMessage } from '@/lib/client/api';
import { useCurrentUser } from '@/lib/client/hooks';
import { emailSchema, passwordSchema, signUpSchema } from '@/schemas/auth';
import { AuthLogo } from '../auth-card';
import { GoogleButton } from '../google-button';
import { ResendCode } from '../resend-code';

type Fields = Record<string, string[] | undefined>;
type Form = { email: string; password: string; displayName: string; username: string };
type CodeSent = { expiresInMinutes: number; resendAfterSeconds: number };

// Spotify's sign-up flow: the email on the first screen, then numbered steps under a progress bar.
// The last step checks the emailed code; the account is only created once it's right.
const STEP_TITLES = ['', 'Create a password', 'Tell us about yourself', 'Verify your email'];
const LAST_STEP = STEP_TITLES.length - 1;
// The step that shows each field, so server errors can send the user back to it.
const FIELD_STEP: Record<string, number> = { email: 0, password: 1, displayName: 2, username: 2, code: 3 };
const MIN_PASSWORD = 8;

export default function SignUpForm({ google }: { google: boolean }) {
  const router = useRouter();
  const { signedIn } = useCurrentUser();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({ email: '', password: '', displayName: '', username: '' });
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [triedPassword, setTriedPassword] = useState(false);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<CodeSent & { at: number }>();
  const usernameStatus = useUsernameStatus(form.username);
  const { toast } = useToast();

  useEffect(() => {
    if (signedIn) router.replace('/');
  }, [signedIn, router]);

  const set = (name: keyof Form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [name]: event.target.value });
    setFields({ ...fields, [name]: undefined });
  };

  const goTo = (next: number) => {
    setError(null);
    setStep(next);
  };

  /** Validates one field and shows its first problem under it. */
  const check = (name: keyof Form, schema: ZodTypeAny) => {
    const result = schema.safeParse(form[name]);
    if (!result.success) setFields({ ...fields, [name]: [result.error.issues[0].message] });
    return result.success;
  };

  /** Shows field errors and returns to the earliest step that has one. */
  const showFieldErrors = (errors: Fields) => {
    setFields(errors);
    const steps = Object.keys(errors)
      .filter((name) => errors[name]?.length)
      .map((name) => FIELD_STEP[name] ?? LAST_STEP);
    if (steps.length) setStep(Math.min(...steps));
  };

  const submitEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (check('email', emailSchema)) goTo(1);
  };

  const submitPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setTriedPassword(true);
    if (form.password.length < MIN_PASSWORD || !check('password', passwordSchema)) return;
    if (!form.username) setForm({ ...form, username: suggestUsername(form.email) });
    goTo(2);
  };

  /** Checks the details and emails a code (again, when resending). Returns false if that failed. */
  const sendCode = async () => {
    setError(null);
    const parsed = signUpSchema.safeParse({ ...form, displayName: form.displayName.trim() || undefined });
    if (!parsed.success) {
      showFieldErrors(parsed.error.flatten().fieldErrors);
      return false;
    }
    try {
      const result = await api<CodeSent>('/api/auth/sign-up', { method: 'POST', json: parsed.data });
      setSent({ ...result, at: Date.now() });
      setCode('');
      setFields({});
      return true;
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.fields) showFieldErrors(caught.fields);
      else setError(errorMessage(caught));
      return false;
    }
  };

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (usernameStatus.available === false) return;
    setLoading(true);
    if (await sendCode()) goTo(3);
    setLoading(false);
  };

  const resend = async () => {
    if (await sendCode()) toast('We sent you a new code');
  };

  /** Creates the account with the emailed code, then signs in. */
  const submitCode = async (value = code) => {
    if (loading) return;
    setError(null);
    if (value.length < 6) {
      setFields({ code: ['Enter all 6 digits.'] });
      return;
    }
    setLoading(true);
    try {
      await api('/api/auth/sign-up/verify', { method: 'POST', json: { email: form.email, code: value } });
      const result = await signIn('credentials', { identifier: form.email, password: form.password, redirect: false });
      if (result?.error) {
        router.push('/sign-in');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.fields) showFieldErrors(caught.fields);
      else setError(errorMessage(caught));
      setLoading(false);
    }
  };

  const usernameError = fields.username?.[0] ?? (usernameStatus.available === false ? usernameStatus.reason : undefined);
  const passwordTooShort = triedPassword && form.password.length < MIN_PASSWORD;

  return (
    <div className="w-full max-w-[436px] px-8 pb-16 pt-10 md:pt-12">
      <AuthLogo />

      {step === 0 ? (
        <form key="email" onSubmit={submitEmail} noValidate className="duration-300 animate-in fade-in">
          <h1 className="mt-8 text-balance text-center text-[2rem] font-bold leading-tight tracking-tight md:text-5xl md:leading-[1.1]">
            Sign up to start reading
          </h1>
          <div className="mx-auto mt-10 max-w-[324px] space-y-6">
            <FormError message={error} />
            <TextField
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@domain.com"
              value={form.email}
              onChange={set('email')}
              error={fields.email?.[0]}
            />
            <PillButton type="submit" size="lg" center>
              Next
            </PillButton>
            {google && (
              <>
                <div className="flex items-center gap-4 text-sm text-pal-subdued">
                  <span className="h-px flex-1 bg-pal-highlight" />
                  or
                  <span className="h-px flex-1 bg-pal-highlight" />
                </div>
                <GoogleButton callbackUrl="/" label="Sign up with Google" />
              </>
            )}
          </div>
          <hr className="mx-auto mt-10 max-w-[324px] border-pal-highlight" />
          <p className="mt-8 text-center text-pal-subdued">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-semibold text-pal-text underline hover:text-pal-accent">
              Log in 
            </Link>
            .
          </p>
        </form>
      ) : (
        <>
          <StepHeader step={step} total={LAST_STEP} title={STEP_TITLES[step]} onBack={() => goTo(step - 1)} />

          {step === 1 && (
            <form key="password" onSubmit={submitPassword} noValidate className={STEP_FORM}>
              {/* Tells password managers which account this password belongs to. */}
              <input type="email" name="email" autoComplete="username" value={form.email} readOnly hidden />
              <TextField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                value={form.password}
                onChange={set('password')}
                error={fields.password?.[0]}
                trailing={
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="grid h-9 w-9 place-items-center text-pal-subdued hover:text-pal-text"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />
              <div>
                <p className="text-sm font-bold">Your password must contain at least</p>
                <ul className="mt-3 space-y-2 text-sm">
                  <Requirement met={form.password.length >= MIN_PASSWORD} flagged={passwordTooShort}>
                    {MIN_PASSWORD} characters
                  </Requirement>
                </ul>
              </div>
              <PillButton type="submit" size="lg" center>
                Next
              </PillButton>
            </form>
          )}

          {step === 2 && (
            <form key="profile" onSubmit={submitProfile} noValidate className={STEP_FORM}>
              <FormError message={error} />
              <TextField
                label="Name"
                name="displayName"
                autoComplete="name"
                autoFocus
                value={form.displayName}
                onChange={set('displayName')}
                error={fields.displayName?.[0]}
                hint="Optional. This name appears on your profile."
              />
              <TextField
                label="Username"
                name="username"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="letters, numbers and _"
                value={form.username}
                onChange={set('username')}
                error={usernameError}
                trailing={
                  usernameStatus.checking ? (
                    <LoaderCircle className="mr-1 h-5 w-5 animate-spin text-pal-subdued" aria-label="Checking" />
                  ) : usernameStatus.available ? (
                    <CircleCheck className="mr-1 h-5 w-5 text-pal-success" aria-label="Available" />
                  ) : undefined
                }
              />
              <PillButton type="submit" size="lg" center loading={loading}>
                Sign up
              </PillButton>
              <p className="text-center text-xs text-pal-subdued">
                By signing up you agree to read kindly and write honestly on {siteConfig.name}.
              </p>
            </form>
          )}

          {step === 3 && (
            <form
              key="code"
              onSubmit={(event) => {
                event.preventDefault();
                void submitCode();
              }}
              noValidate
              className={STEP_FORM}
            >
              <FormError message={error} />
              <p className="text-pal-subdued">
                Enter the 6-digit code we sent to <span className="break-all font-semibold text-pal-text">{form.email}</span>.
                {sent && ` It works for ${sent.expiresInMinutes} minutes.`}
              </p>
              <div>
                <OtpInput
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setFields({ ...fields, code: undefined });
                  }}
                  onComplete={(value) => void submitCode(value)}
                  invalid={Boolean(fields.code)}
                  disabled={loading}
                  autoFocus
                />
                <FieldError message={fields.code?.[0]} />
              </div>
              <PillButton type="submit" size="lg" center loading={loading}>
                Verify and sign up
              </PillButton>
              {sent && <ResendCode availableAt={sent.at + sent.resendAfterSeconds * 1000} onResend={resend} />}
            </form>
          )}
        </>
      )}
    </div>
  );
}

const STEP_FORM = 'mx-auto mt-8 max-w-[324px] space-y-6 duration-300 animate-in fade-in slide-in-from-right-6';

/** Progress bar, back arrow and "Step 1 of 2" heading, as on Spotify's sign-up steps. */
function StepHeader({ step, total, title, onBack }: { step: number; total: number; title: string; onBack: () => void }) {
  return (
    <div className="mt-8">
      <div
        role="progressbar"
        aria-label="Sign-up progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        className="h-0.5 overflow-hidden rounded-full bg-pal-highlight"
      >
        <div className="h-full bg-pal-primary transition-[width] duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Go back"
          onClick={onBack}
          className="-ml-3 grid h-12 w-12 shrink-0 place-items-center rounded-full text-pal-subdued transition hover:scale-105 hover:text-pal-text"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <div>
          <p className="text-pal-subdued">
            Step {step} of {total}
          </p>
          <h1 className="font-bold">{title}</h1>
        </div>
      </div>
    </div>
  );
}

/** A password rule that fills in once it's met, and turns red if the user moved on without it. */
function Requirement({ met, flagged, children }: { met: boolean; flagged: boolean; children: React.ReactNode }) {
  return (
    <li className={cx('flex items-center gap-2', flagged ? 'text-pal-danger' : 'text-pal-text')}>
      <span
        className={cx(
          'grid h-4 w-4 shrink-0 place-items-center rounded-full',
          met ? 'bg-pal-primary text-pal-on-primary' : flagged ? 'border border-pal-danger' : 'border border-pal-muted',
        )}
      >
        {met && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}

/** A starting username from the email address, e.g. "jane.doe@mail.com" → "janedoe". */
function suggestUsername(email: string) {
  const name = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  return name.length >= 3 ? name : '';
}

/** Checks a username as you type (debounced). */
function useUsernameStatus(username: string) {
  const [status, setStatus] = useState<{ checking?: boolean; available?: boolean; reason?: string }>({});

  useEffect(() => {
    const value = username.trim();
    if (value.length < 3) {
      setStatus({});
      return;
    }
    let current = true;
    setStatus({ checking: true });
    const timer = setTimeout(() => {
      api<{ available: boolean; reason?: string }>(`/api/auth/username-available?username=${encodeURIComponent(value)}`)
        .then((result) => current && setStatus(result))
        .catch(() => current && setStatus({}));
    }, 400);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [username]);

  return status;
}
