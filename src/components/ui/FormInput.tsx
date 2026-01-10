"use client";

import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes } from "react";

// Shared input styling classes
export const inputClassName =
  "mt-1 w-full p-3 rounded-md outline-none bg-card text-foreground border border-border font-normal placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring";

export const labelClassName = "text-foreground font-semibold";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, id, className, ...props }, ref) => (
    <label htmlFor={id} className={labelClassName}>
      {label}
      <input
        ref={ref}
        id={id}
        className={`${inputClassName} ${className || ""}`}
        {...props}
      />
    </label>
  )
);
FormInput.displayName = "FormInput";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, id, className, options, ...props }, ref) => (
    <label htmlFor={id} className={labelClassName}>
      {label}
      <select
        ref={ref}
        id={id}
        className={`${inputClassName} appearance-none ${className || ""}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
);
FormSelect.displayName = "FormSelect";
