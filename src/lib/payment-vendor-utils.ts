/** Format date as `DD Mon YY` (matches Payment Vendor Approval page). */
export function formatPaymentDate(dateString: string): string {
  if (!dateString || dateString === "—") return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = monthNames[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

/** Planned payment due date = I2R step 6 actual date + GRN payment terms (days). */
export function getPlannedPaymentDate(
  paymentTermsInDays?: string | number | null,
  i2rActual6?: string | null
): string {
  if (!i2rActual6 || i2rActual6 === "—" || paymentTermsInDays == null || paymentTermsInDays === "") {
    return "—";
  }

  const days = parseInt(String(paymentTermsInDays), 10);
  if (isNaN(days)) return "—";

  const base = new Date(i2rActual6);
  if (isNaN(base.getTime())) return "—";

  base.setDate(base.getDate() + days);
  return formatPaymentDate(base.toISOString());
}
