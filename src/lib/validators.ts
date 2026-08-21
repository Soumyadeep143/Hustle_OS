const NAME_PATTERN = /^[A-Za-z][A-Za-z '-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function nameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'Name is too short';
  if (trimmed.length > 60) return 'Name is too long';
  if (!NAME_PATTERN.test(trimmed)) return 'Name can only contain letters, spaces, hyphens and apostrophes';
  return null;
}

export function emailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address';
  return null;
}

export function passwordError(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain a letter and a number';
  return null;
}
