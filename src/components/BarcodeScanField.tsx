import { useState } from "react";
import type { KeyboardEvent } from "react";
import { InputAdornment, TextField } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

interface BarcodeScanFieldProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  onScan: (code: string) => void;
}

/**
 * A "scan or type + Enter" input, compatible with any external keyboard-wedge (HID) barcode
 * scanner with zero app-side SDK integration - such a scanner just types the decoded barcode
 * followed by an Enter keystroke into whatever text input currently has focus. Enter is
 * treated as "an entry just completed" (the same signal whether it came from a hardware
 * scanner or a human typing a SKU and pressing Enter) - fires onScan with the current value,
 * then clears itself so it's immediately ready for the next scan. Works identically with a USB
 * scanner on desktop or a Bluetooth scanner on a mobile browser.
 */
export function BarcodeScanField({ label, placeholder, disabled, onScan }: BarcodeScanFieldProps) {
  const [value, setValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
      setValue("");
    }
  };

  return (
    <TextField
      label={label ?? "Scan or enter SKU"}
      placeholder={placeholder ?? "Scan a barcode, or type a SKU and press Enter"}
      size="small"
      fullWidth
      disabled={disabled}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <QrCodeScannerIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
