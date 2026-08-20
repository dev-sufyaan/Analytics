'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const ButtonPrimary = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono text-[13px] md:text-[14px] font-medium tracking-[0.08em] uppercase select-none',
          'bg-black text-white rounded-[4px] px-6 h-10 transition-colors duration-150',
          'hover:bg-[#1a1a24] active:bg-[#2c2c38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ButtonPrimary.displayName = 'ButtonPrimary';

export const ButtonSecondaryMint = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono text-[13px] md:text-[14px] font-medium tracking-[0.08em] uppercase select-none',
          'bg-[#c8f6f9] text-black rounded-[4px] px-6 h-10 transition-colors duration-150',
          'hover:bg-[#b0f0f4] active:bg-[#98ebf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f6f9] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ButtonSecondaryMint.displayName = 'ButtonSecondaryMint';

export const ButtonSecondaryWhite = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono text-[13px] md:text-[14px] font-medium tracking-[0.08em] uppercase select-none',
          'bg-white text-black rounded-[4px] px-6 h-10 transition-colors duration-150',
          'hover:bg-[#f2f2f2] active:bg-[#e5e5e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ButtonSecondaryWhite.displayName = 'ButtonSecondaryWhite';

export const ButtonGhostOnDark = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono text-[12px] font-medium tracking-[0.06em] uppercase select-none',
          'bg-[#26263a] text-white rounded-[4px] px-4 h-9 transition-colors duration-150',
          'hover:bg-[#313641] active:bg-[#3d4452] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26263a] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ButtonGhostOnDark.displayName = 'ButtonGhostOnDark';

export const ButtonOutline = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono text-[12px] font-medium tracking-[0.06em] uppercase select-none',
          'bg-white text-black border border-[#ebebeb] rounded-[3.25px] px-4 h-9 transition-colors duration-150',
          'hover:bg-[#f7f7f7] hover:border-[#dedede] active:bg-[#ececec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ButtonOutline.displayName = 'ButtonOutline';

export interface ButtonIconProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'outline' | 'ghost-on-dark';
  className?: string;
}

export const ButtonIcon = React.forwardRef<HTMLButtonElement, ButtonIconProps>(
  ({ variant = 'outline', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-[4px] transition-colors duration-150 cursor-pointer select-none',
          variant === 'outline' && 'bg-white text-black border border-[#ebebeb] hover:bg-[#f7f7f7]',
          variant === 'ghost-on-dark' && 'bg-[#26263a] text-white hover:bg-[#313641]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ButtonIcon.displayName = 'ButtonIcon';
