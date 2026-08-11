const PRODUCTION_APP_URL = "https://srv1639142.hstgr.cloud";

/** Base URL for deep links in WhatsApp/notifications. Uses NEXTAUTH_URL in dev (localhost) or production when deployed. */
export function getAppBaseUrl(): string {
  const fromEnv = (
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "");

  if (fromEnv) return fromEnv;
  return PRODUCTION_APP_URL;
}

export function getPaymentVendorApprovalUrl(grnNo: string): string {
  return `${getAppBaseUrl()}/payment-vendor-approval?grn=${encodeURIComponent(grnNo)}`;
}

export function getLeaveUrl(leaveId: string): string {
  return `${getAppBaseUrl()}/leave?id=${encodeURIComponent(leaveId)}`;
}
