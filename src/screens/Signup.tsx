import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../store/useAuth';
import { nameError as validateName, emailError as validateEmail, passwordError as validatePassword } from '../lib/validators';

const INPUT_CLASS =
  'rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-raised)] px-3.5 py-2.5 text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-3)]';

export function Signup() {
  const navigate = useNavigate();
  const signup = useAuth((s) => s.signup);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const nameErr = touched ? validateName(name) : null;
  const emailErr = touched ? validateEmail(email) : null;
  const passwordErr = touched ? validatePassword(password) : null;
  const confirmErr = touched && confirmPassword !== password ? 'Passwords do not match' : null;

  const isValid =
    !validateName(name) && !validateEmail(email) && !validatePassword(password) && confirmPassword === password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await signup(name.trim(), email.trim(), password);
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
            Create your account
          </div>
          <p className="mt-1 text-[13.5px] text-[var(--color-ink-2)]">Set up HustleOS to track your job search</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
          <div className="flex flex-col gap-1">
            <input
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Full name"
              className={INPUT_CLASS}
            />
            {nameErr && <span className="text-[13px] text-[var(--color-red)]">{nameErr}</span>}
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Password"
              className={INPUT_CLASS}
            />
            {passwordErr && <span className="text-[13px] text-[var(--color-red)]">{passwordErr}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Confirm password"
              className={INPUT_CLASS}
            />
            {confirmErr && <span className="text-[13px] text-[var(--color-red)]">{confirmErr}</span>}
          </div>

          {serverError && <p className="text-[13px] text-[var(--color-red)]">{serverError}</p>}

          <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={touched && !isValid}>
            Sign up
          </Button>
        </form>

        <p className="text-center text-[13.5px] text-[var(--color-ink-2)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--color-blue)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
