import type { PropsWithChildren } from 'react';

interface ButtonProps extends PropsWithChildren {
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'default' | 'ghost' | 'danger';
  disabled?: boolean;
}

export function Button({ children, onClick, type = 'button', variant = 'default', disabled = false }: ButtonProps): JSX.Element {
  return (
    <button className="button" data-variant={variant} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  );
}
