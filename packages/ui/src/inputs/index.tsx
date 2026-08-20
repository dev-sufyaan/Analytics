'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// 1. TextInput
export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  containerClassName?: string;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, helper, error, className, containerClassName, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('flex flex-col w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="font-mono text-[11px] font-medium tracking-[0.055em] uppercase text-[#71717a] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full bg-white text-black border border-[#ebebeb] rounded-[4px] px-3.5 h-10 text-[14px]',
            'placeholder:text-[#999999] transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black',
            'disabled:opacity-50 disabled:bg-[#f9f9f9] disabled:cursor-not-allowed',
            error && 'border-black ring-1 ring-black',
            className
          )}
          {...props}
        />
        {helper && !error && (
          <p className="font-display text-[13px] text-[#71717a] mt-1.5">{helper}</p>
        )}
        {error && (
          <p className="font-mono text-[11px] font-medium uppercase text-black mt-1.5">
            {error}
          </p>
        )}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

// 2. TogglePillGroup
export interface TogglePillOption<T extends string = string> {
  value: T;
  label: string;
}

export interface TogglePillGroupProps<T extends string = string> {
  options: TogglePillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function TogglePillGroup<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: TogglePillGroupProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center bg-[#f7f7f7] border border-[#ebebeb] rounded-[4px] p-1 gap-1 select-none',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-1 font-mono text-[11px] font-medium tracking-[0.055em] uppercase rounded-[4px] transition-all cursor-pointer',
              isActive
                ? 'bg-black text-white'
                : 'bg-transparent text-[#71717a] hover:text-black hover:bg-black/5'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// 3. FeatureTabPill
export interface FeatureTabPillProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FeatureTabPill({ tabs, activeTab, onChange, className }: FeatureTabPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center bg-white border border-[#ebebeb] rounded-[8px] p-1 gap-1 select-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-5 py-2 font-display text-[14px] font-medium tracking-[-0.16px] rounded-[6px] transition-all cursor-pointer',
              isActive
                ? 'bg-black text-white'
                : 'bg-transparent text-[#71717a] hover:text-black hover:bg-[#f7f7f7]'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// 4. FilterTab
export interface FilterTabProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export function FilterTab({ label, active, count, onClick, className }: FilterTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 font-display text-[13px] rounded-[3.25px] transition-colors cursor-pointer inline-flex items-center gap-2 select-none',
        active
          ? 'bg-black text-white font-medium'
          : 'bg-white border border-[#ebebeb] text-[#71717a] hover:text-black hover:border-[#dedede]',
        className
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-[2px]',
            active ? 'bg-white/20 text-white' : 'bg-[#ebebeb] text-black'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// 5. Checkbox
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const checkId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
        <input
          id={checkId}
          type="checkbox"
          ref={ref}
          className={cn(
            'w-4 h-4 rounded-[3px] border border-[#ebebeb] text-black bg-white accent-black focus:ring-black cursor-pointer',
            className
          )}
          {...props}
        />
        {label && (
          <span className="font-display text-[14px] text-black font-normal">{label}</span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// 6. Switch
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer',
          checked ? 'bg-black' : 'bg-[#ebebeb]'
        )}
      >
        <span
          className={cn(
            'inline-block w-4 h-4 bg-white rounded-full transition-transform transform absolute top-1 left-1',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      {label && (
        <span className="font-display text-[14px] text-black">{label}</span>
      )}
    </label>
  );
}
