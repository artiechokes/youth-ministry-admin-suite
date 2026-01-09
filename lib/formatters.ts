const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value);
}

export function formatUsPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6);
  return `(${area})${prefix}-${line}`;
}
