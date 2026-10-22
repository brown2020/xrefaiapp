import { useId } from "react";
import Select, { StylesConfig } from "react-select";

interface Option {
  value: string;
  label: string;
}

interface StyledSelectProps {
  label: string;
  name: string;
  options: Option[];
  onChange: (value: Option | null) => void;
  placeholder?: string;
}

const selectStyles: StylesConfig<Option, false> = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    minHeight: "2.75rem",
    borderRadius: "0.5rem",
    backgroundColor: "var(--card)",
    borderColor: state.isFocused ? "var(--ring)" : "var(--border)",
    boxShadow: state.isFocused ? "0 0 0 2px color-mix(in srgb, var(--ring) 25%, transparent)" : "none",
    ":hover": { borderColor: state.isFocused ? "var(--ring)" : "var(--muted-foreground)" },
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: "var(--muted-foreground)",
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: "var(--foreground)",
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    zIndex: 20,
    borderRadius: "0.5rem",
    border: "1px solid var(--border)",
    boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
    backgroundColor: "var(--card)",
  }),
  option: (baseStyles, state) => ({
    ...baseStyles,
    color: state.isSelected ? "var(--primary-foreground)" : "var(--foreground)",
    backgroundColor: state.isSelected
      ? "var(--primary)"
      : state.isFocused
        ? "var(--muted)"
        : "transparent",
    ":active": { backgroundColor: "var(--muted)" },
  }),
};

export function StyledSelect({
  label,
  name,
  options,
  onChange,
  placeholder = "Any",
}: StyledSelectProps) {
  const inputId = useId();
  return (
    <div className="w-full sm:w-1/2">
      <label htmlFor={inputId} className="text-foreground font-semibold">
        {label}
      </label>
      <Select<Option>
        inputId={inputId}
        instanceId={name}
        styles={selectStyles}
        className="mt-1"
        isClearable
        isSearchable
        name={name}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
      />
    </div>
  );
}
