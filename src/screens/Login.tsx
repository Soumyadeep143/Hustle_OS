import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../store/useAuth';
import { emailError as validateEmail } from '../lib/validators';

const INPUT_CLASS =
  'rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

export function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailErr = touched ? validateEmail(email) : null;
  const passwordErr = touched && !password ? 'Password is required' : null;
  const isValid = !validateEmail(email) && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-6 px-6 py-10">
        <div>
          <div className="font-[var(--font-display)] text-[24px] font-semibold text-[var(--color-ink)]">
            Welcome back
          </div>
          <p className="mt-1 text-[13.5px] text-[var(--color-ink-2)]">Sign in to your HustleOS account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
          <div className="flex flex-col gap-1">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Email"
              className={INPUT_CLASS}
            />
            {emailErr && <span className="text-[13px] text-[var(--color-red)]">{emailErr}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Password"
              className={INPUT_CLASS}
            />
            {passwordErr && <span className="text-[13px] text-[var(--color-red)]">{passwordErr}</span>}
          </div>

          {serverError && <p className="text-[13px] text-[var(--color-red)]">{serverError}</p>}

          <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={touched && !isValid}>
            Sign in
          </Button>
        </form>

        <p className="text-center text-[13.5px] text-[var(--color-ink-2)]">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-[var(--color-blue)]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
