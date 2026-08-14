import { useMemo, useState } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { CircularProgress, TextField } from "@mui/material";
import type { Customer } from "../../api/customersApi";
import { useCustomers } from "../../api/customersApi";
import { CustomerFormDialog } from "./CustomerFormDialog";

interface AddNewOption {
  inputValue: string;
  label: string;
}

type OptionType = Customer | AddNewOption;

function isAddNewOption(option: OptionType): option is AddNewOption {
  return "inputValue" in option;
}

const filter = createFilterOptions<OptionType>();

export interface CustomerAutocompleteProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
}

/**
 * Search-as-you-type Customer picker with an inline "+ Add new customer" option - the
 * dropdown+quick-add UX a Quotation's Customer field needs. Debounced via React Query's own
 * caching (short search terms just refetch); no separate debounce timer needed at this scale.
 */
export function CustomerAutocomplete({ value, onChange, label, error, helperText }: CustomerAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSeedName, setQuickAddSeedName] = useState("");

  const { data, isFetching } = useCustomers({ search: inputValue, size: 20 });
  const options = useMemo<OptionType[]>(() => data?.content ?? [], [data]);

  return (
    <>
      <Autocomplete<OptionType, false, false, false>
        options={options}
        value={value}
        loading={isFetching}
        filterOptions={(opts, params) => {
          const filtered = filter(opts, params);
          const { inputValue: typed } = params;
          const alreadyExists = opts.some(
            (option) => !isAddNewOption(option) && typed.trim().toLowerCase() === option.name.toLowerCase(),
          );
          if (typed.trim() !== "" && !alreadyExists) {
            filtered.push({ inputValue: typed, label: `+ Add new customer "${typed}"` });
          }
          return filtered;
        }}
        getOptionLabel={(option) => (isAddNewOption(option) ? option.label : option.name)}
        isOptionEqualToValue={(option, val) =>
          !isAddNewOption(option) && !isAddNewOption(val) && option.id === val.id
        }
        onInputChange={(_, next) => setInputValue(next)}
        onChange={(_, selected) => {
          if (selected == null) {
            onChange(null);
          } else if (isAddNewOption(selected)) {
            setQuickAddSeedName(selected.inputValue.trim());
            setQuickAddOpen(true);
          } else {
            onChange(selected);
          }
        }}
        renderOption={(props, option) => {
          const { key, ...rest } = props as typeof props & { key?: string };
          return (
            <li key={key ?? (isAddNewOption(option) ? option.inputValue : option.id)} {...rest}>
              {isAddNewOption(option) ? option.label : option.name}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label ?? "Customer"}
            error={error}
            helperText={helperText}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {isFetching && <CircularProgress size={16} />}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
      <CustomerFormDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        initialName={quickAddSeedName}
        onSaved={(saved) => {
          onChange(saved);
          setQuickAddOpen(false);
        }}
      />
    </>
  );
}
