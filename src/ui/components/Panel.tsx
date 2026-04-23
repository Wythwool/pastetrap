import type { PropsWithChildren } from 'react';

export function Panel({ children }: PropsWithChildren): JSX.Element {
  return <section className="panel stack">{children}</section>;
}
