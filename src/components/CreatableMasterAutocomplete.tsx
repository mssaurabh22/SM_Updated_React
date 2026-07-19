import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { TextField } from "@mui/material";
import type { MasterDataItem } from "../api/masterDataApi";

/** Synthetic option shown when the typed text doesn't match any existing master entry. */
interface AddNewOption {
  inputValue: string;
  label: string;
}

type OptionType = MasterDataItem | AddNewOption;

function isAddNewOption(option: OptionType | string): option is AddNewOption {
  return typeof option !== "string" && "inputValue" in option;
}

const filter = createFilterOptions<OptionType>();

export interface CreatableMasterAutocompleteProps {
  label: string;
  /** Master-data options fetched via useMasterData(type). */
  options: MasterDataItem[];
  /** Set when the field references a real master-data row. */
  idValue: string | null;
  /** Set when the rep typed a free-text value not present in the master list. */
  otherValue: string | null;
  /**
   * Fires with exactly one of {id, other} populated (or both null when cleared).
   * Picking a real option sends {id, other: null}; confirming free text sends
   * {id: null, other: text}.
   */
  onChange: (next: { id: string | null; other: string | null }) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

/**
 * Pick-existing-or-type-your-own Autocomplete for master-data-driven fields on
 * Lead/Visit forms. Wraps MUI's standard "freeSolo creatable" recipe: selecting
 * an existing option stores its id; typing text that doesn't match any option
 * (and confirming it, via the synthetic "Add ..." option or by blurring) stores
 * it as free text instead. The two are mutually exclusive, matching the
 * backend's fieldId/fieldOther pair contract.
 */
export function CreatableMasterAutocomplete({
  label,
  options,
  idValue,
  otherValue,
  onChange,
  error,
  helperText,
  disabled,
}: CreatableMasterAutocompleteProps) {
  const value: OptionType | string | null = idValue
    ? (options.find((option) => option.id === idValue) ?? null)
    : (otherValue ?? null);

  return (
    <Autocomplete<OptionType, false, false, true>
      freeSolo
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      disabled={disabled}
      options={options}
      value={value}
      getOptionLabel={(option) => {
        if (typeof option === "string") return option;
        if (isAddNewOption(option)) return option.inputValue;
        return option.label;
      }}
      isOptionEqualToValue={(option, val) => {
        if (typeof val === "string") return false;
        if (isAddNewOption(option) || isAddNewOption(val)) return false;
        return option.id === val.id;
      }}
      filterOptions={(opts, params) => {
        const filtered = filter(opts, params);
        const { inputValue } = params;
        const alreadyExists = opts.some(
          (option) => inputValue.trim().toLowerCase() === option.label.toLowerCase(),
        );
        if (inputValue.trim() !== "" && !alreadyExists) {
          filtered.push({ inputValue, label: `Add "${inputValue}"` });
        }
        return filtered;
      }}
      onChange={(_, selected) => {
        if (selected == null) {
          onChange({ id: null, other: null });
        } else if (typeof selected === "string") {
          const trimmed = selected.trim();
          onChange(trimmed ? { id: null, other: trimmed } : { id: null, other: null });
        } else if (isAddNewOption(selected)) {
          onChange({ id: null, other: selected.inputValue.trim() });
        } else {
          onChange({ id: selected.id, other: null });
        }
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props as typeof props & { key?: string };
        return (
          <li key={key ?? (typeof option === "string" ? option : isAddNewOption(option) ? option.inputValue : option.id)} {...rest}>
            {typeof option === "string" ? option : option.label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  );
}
