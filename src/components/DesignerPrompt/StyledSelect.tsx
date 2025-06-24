import Select, { StylesConfig } from 'react-select';

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
  control: (baseStyles) => ({
    ...baseStyles,
    color: '#0B3C68',
    borderColor: '#ECECEC',
    backgroundColor: '#F5F5F5',
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    color: '#fff',
    backgroundColor: '#131C3C',
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: '#BBBEC9',
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: '#0B3C68',
    backgroundColor: '#F5F5F5',
  }),
  option: (baseStyles, state) => ({
    ...baseStyles,
    color: state.isFocused ? '#fff' : '#0B3C68',
    backgroundColor: state.isFocused ? '#192449' : '#F6F7F9',
    ':hover': {
      backgroundColor: '#263566'
    }
  }),
};

export function StyledSelect({ label, name, options, onChange, placeholder }: StyledSelectProps) {
  return (
    <div className="w-full sm:w-1/2">
      <div className="text-[#041D34] font-semibold">{label}</div>
      <Select<Option>
        styles={selectStyles}
        className="mt-1 shadow-none"
        isClearable={true}
        isSearchable={true}
        name={name}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
      />
    </div>
  );
}
