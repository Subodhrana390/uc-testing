export function formatCurrency(value: number | string | null | undefined) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : 0;

  const validNumber = Number.isFinite(numericValue) ? numericValue : 0;
  const roundedValue = Math.round(validNumber * 100) / 100;
  const hasPaise = roundedValue % 1 !== 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(validNumber);
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "NA";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getExclusivePrice(price: number, isTaxInclusive?: boolean, taxRate?: number) {
  if (isTaxInclusive === false) return price;
  const rate = taxRate || 18; // Defaulting to 18% if not explicitly set
  return price / (1 + rate / 100);
}
