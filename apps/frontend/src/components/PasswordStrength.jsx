import { useMemo } from 'react';

function getStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const colors = ['', '#DC2626', '#D97706', '#EAB308', '#16A34A'];

export default function PasswordStrength({ password }) {
  const strength = useMemo(() => getStrength(password), [password]);
  if (!password) return null;
  return (
    <div>
      <div className="password-strength-bar">
        <div className={`password-strength-fill strength-${strength}`} />
      </div>
      <p className="strength-text" style={{ color: colors[strength] }}>
        Password strength: {labels[strength]}
      </p>
    </div>
  );
}
