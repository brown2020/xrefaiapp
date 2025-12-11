"use client";

import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes } from "react";

// Shared input styling classes
export const inputClassName =
  "bg-[#F5F5F5] text-[#0B3C68] mt-1 border border-[#ECECEC] font-normal placeholder:text-[#BBBEC9] focus:bg-[#F5F5F5] w-full p-3 rounded-md outline-none";

export const labelClassName = "text-[#041D34] font-semibold";

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
