import type { ReactNode } from 'react';

// Keeps the content centered and readable across screen sizes.
export function Container({ children }: { children: ReactNode }) {
  return <div className="container">{children}</div>;
}
