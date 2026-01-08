'use client';

import { TeenRegistrationForm } from '@/components/TeenRegistrationForm';

// Teen registration form collects the base contact info for teens and parents.
export default function TeenRegistration() {
  return (
    <div className="card">
      <h1>Teen Registration</h1>
      <p className="muted">
        This creates a record with a pending parent verification status. We will build parent portal access later.
      </p>
      <TeenRegistrationForm />
    </div>
  );
}
