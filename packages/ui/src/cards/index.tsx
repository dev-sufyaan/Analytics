'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// 1. HeroBandDark - canvas-dark, section padding, 50/50 headline + ribbon
export interface HeroBandDarkProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function HeroBandDark({ children, className, ...props }: HeroBandDarkProps) {
  return (
    <section
      className={cn(
        'w-full bg-[#010120] text-white py-16 md:py-20 lg:py-24 border-b border-[#26263a] relative overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 relative z-10">
        {children}
      </div>
    </section>
  );
}

// 2. ResearchBandDark - canvas-dark, card grid
export function ResearchBandDark({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        'w-full bg-[#010120] text-white py-16 md:py-20 border-t border-b border-[#26263a]',
        className
      )}
      {...props}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        {children}
      </div>
    </section>
  );
}

// 3. ResearchCard - dark fill, 1px dark-soft, pad 24, radius-sm, mono tag + display-md + body
export interface ResearchCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tag?: string;
  title: string;
  description: string;
  className?: string;
}

export function ResearchCard({ tag, title, description, className, ...props }: ResearchCardProps) {
  return (
    <div
      className={cn(
        'bg-[#313641] border border-[#26263a] rounded-[4px] p-6 text-white flex flex-col justify-between transition-colors',
        className
      )}
      {...props}
    >
      <div>
        {tag && (
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] block mb-3">
            {tag}
          </span>
        )}
        <h3 className="font-display text-[22px] leading-[25.3px] font-medium tracking-[-0.22px] mb-3 text-white">
          {title}
        </h3>
        <p className="font-display text-[15px] leading-[22px] text-zinc-300">
          {description}
        </p>
      </div>
    </div>
  );
}

// 4. ArticleCard - canvas, 16:9 top image radius-sm on image only
export interface ArticleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc?: string;
  imageAlt?: string;
  tag?: string;
  title: string;
  description: string;
  className?: string;
}

export function ArticleCard({
  imageSrc,
  imageAlt,
  tag,
  title,
  description,
  className,
  ...props
}: ArticleCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#ebebeb] rounded-[4px] overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      {imageSrc && (
        <div className="w-full aspect-[16/9] bg-[#ebebeb] overflow-hidden">
          <img src={imageSrc} alt={imageAlt || title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        {tag && (
          <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999] mb-2">
            {tag}
          </span>
        )}
        <h3 className="font-display text-[20px] font-medium tracking-[-0.22px] text-black mb-2">
          {title}
        </h3>
        <p className="font-display text-[14px] leading-[20px] text-[#71717a] flex-1">
          {description}
        </p>
      </div>
    </div>
  );
}

// 5. CodeEditorMockup - canvas-dark, mono-caption, pad 24, radius-sm, no traffic lights
export interface CodeEditorMockupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  code: string;
  onCopy?: () => void;
  className?: string;
}

export function CodeEditorMockup({ title, code, onCopy, className, ...props }: CodeEditorMockupProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'bg-[#010120] border border-[#26263a] rounded-[4px] overflow-hidden text-white shadow-xs',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#26263a] bg-[#090924]">
        <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999]">
          {title || 'TRACKER SNIPPET'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#bdbbff] hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded-[2px] bg-[#26263a]/50 hover:bg-[#26263a]"
        >
          {copied ? '✓ COPIED' : 'COPY'}
        </button>
      </div>
      <div className="p-5 font-mono text-[13px] leading-[22px] text-[#e0e0e0] overflow-x-auto whitespace-pre dark-scrollbar">
        <code>{code}</code>
      </div>
    </div>
  );
}

// 6. StatsCardTinted - mint or periwinkle, ink, pad 32, radius-sm, display number + mono label
export interface StatsCardTintedProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: string;
  variant?: 'mint' | 'periwinkle';
  loading?: boolean;
  className?: string;
}

export function StatsCardTinted({
  label,
  value,
  delta,
  variant = 'mint',
  loading,
  className,
  ...props
}: StatsCardTintedProps) {
  const bg = variant === 'mint' ? 'bg-[#c8f6f9]' : 'bg-[#bdbbff]';

  return (
    <div
      className={cn(
        bg,
        'text-black rounded-[4px] p-6 md:p-8 flex flex-col justify-between transition-colors',
        className
      )}
      {...props}
    >
      <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-black/75 mb-3">
        {label}
      </span>
      <div className="flex items-baseline justify-between gap-2">
        {loading ? (
          <div className="w-24 h-10 bg-black/10 rounded-[2px] animate-pulse" />
        ) : (
          <span className="font-display text-[32px] md:text-[40px] leading-tight font-medium tracking-[-0.8px]">
            {value}
          </span>
        )}
        {delta && !loading && (
          <span className="font-display text-[13px] text-black/70">
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

// 7. StatsCardPlain - canvas + hairline, same type
export interface StatsCardPlainProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: string;
  loading?: boolean;
  className?: string;
}

export function StatsCardPlain({
  label,
  value,
  delta,
  loading,
  className,
  ...props
}: StatsCardPlainProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#ebebeb] text-black rounded-[4px] p-6 md:p-8 flex flex-col justify-between transition-colors',
        className
      )}
      {...props}
    >
      <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] mb-3">
        {label}
      </span>
      <div className="flex items-baseline justify-between gap-2">
        {loading ? (
          <div className="w-24 h-10 bg-zinc-100 rounded-[2px] animate-pulse" />
        ) : (
          <span className="font-display text-[32px] md:text-[40px] leading-tight font-medium tracking-[-0.8px] text-black">
            {value}
          </span>
        )}
        {delta && !loading && (
          <span className="font-display text-[13px] text-[#71717a]">
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

// 8. ChartCard - canvas + hairline, pad 24, radius-sm, mono eyebrow + chart
export interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
  ...props
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#ebebeb] rounded-[4px] p-6 flex flex-col',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#ebebeb] gap-2">
          <div>
            {title && (
              <h4 className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a]">
                {title}
              </h4>
            )}
            {subtitle && (
              <p className="font-display text-[14px] text-[#71717a] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="w-full flex-1 min-h-[260px] relative">
        {children}
      </div>
    </div>
  );
}

// 9. PanelCard - canvas + hairline, pad 24, radius-sm
export interface PanelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PanelCard({
  title,
  eyebrow,
  action,
  children,
  className,
  ...props
}: PanelCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#ebebeb] rounded-[4px] p-6 flex flex-col',
        className
      )}
      {...props}
    >
      {(title || eyebrow || action) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#ebebeb]">
          <div>
            {eyebrow && (
              <span className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#999999] block mb-1">
                {eyebrow}
              </span>
            )}
            {title && (
              <h3 className="font-display text-[18px] font-medium tracking-[-0.2px] text-black">
                {title}
              </h3>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

// 10. AuthFormCard - canvas + hairline, pad 24-32, radius-sm
export interface AuthFormCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function AuthFormCard({ children, className, ...props }: AuthFormCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#ebebeb] rounded-[4px] p-6 md:p-8 max-w-md w-full mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// 11. ModalCard - canvas + hairline, radius-sm, Level 3 shadow allowed.
//     Closes on ESC and backdrop click; traps initial focus; locks body scroll.
export interface ModalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ModalCard({
  isOpen,
  onClose,
  title,
  children,
  className,
  ...props
}: ModalCardProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Focus the dialog itself so ESC works immediately without stealing
    // focus from any specific control the caller wants focused.
    const raf = requestAnimationFrame(() => dialogRef.current?.focus());

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'bg-white border border-[#ebebeb] rounded-[4px] p-6 md:p-8 max-w-lg w-full shadow-[0_4px_10px_rgba(1,1,32,0.10)] relative outline-none',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#ebebeb]">
          <h3 className="font-display text-[20px] font-medium tracking-[-0.2px] text-black">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="font-mono text-[12px] uppercase text-[#71717a] hover:text-black cursor-pointer p-1"
          >
            ESC
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// 12. EmptyStateCard - canvas + hairline, pad 32, radius-sm
export interface EmptyStateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStateCard({
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-[#ebebeb] rounded-[4px] p-8 md:p-12 text-center flex flex-col items-center justify-center',
        className
      )}
      {...props}
    >
      <h3 className="font-display text-[22px] leading-[25.3px] font-medium tracking-[-0.22px] text-black mb-2">
        {title}
      </h3>
      <p className="font-display text-[15px] leading-[21px] text-[#71717a] max-w-md mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

// 13. Toast - canvas + hairline, Level 3, caption. Auto-dismisses after
//     `duration` ms (timer resets when the message changes); pause on hover.
export interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

export function Toast({ message, isVisible, onClose, duration = 4000, className }: ToastProps) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!isVisible || !onClose) return;
    timerRef.current = setTimeout(onClose, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
      }}
      onMouseLeave={() => {
        if (onClose) timerRef.current = setTimeout(onClose, duration);
      }}
      className={cn(
        'fixed bottom-6 right-6 z-50 bg-white border border-[#ebebeb] rounded-[4px] px-5 py-3 shadow-[0_4px_10px_rgba(1,1,32,0.10)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200',
        className
      )}
    >
      <span className="w-2 h-2 rounded-full bg-[#c8f6f9]" />
      <span className="font-display text-[14px] text-black">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="ml-2 font-mono text-[11px] uppercase text-[#71717a] hover:text-black cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
}
