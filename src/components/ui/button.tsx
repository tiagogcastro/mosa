import { ButtonHTMLAttributes } from 'react';
export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'bg-primary text-background hover:bg-[#b7cdf2]',
    secondary: 'bg-elevated text-foreground hover:bg-border',
    ghost: 'text-muted hover:bg-elevated hover:text-foreground',
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}
