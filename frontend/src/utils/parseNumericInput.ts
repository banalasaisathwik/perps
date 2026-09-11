// Form fields keep their display formatting. Normalize only at the API
// boundary so values such as "77,121.79" remain valid numeric input.
export function parseNumericInput(value: string): number {
  return Number(value.trim().replaceAll(",", ""));
}
