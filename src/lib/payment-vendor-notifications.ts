import { sendWhatsAppMessage } from "@/lib/maytapi";
import { getPaymentVendorApprovalUrl } from "@/lib/app-url";

export const PAYMENT_VENDOR_PHONES = {
  MD: "9899444530",
  PAYMENT_USER: "8766272040",
  PAYMENT_USER_NAME: "HIMANSHI NAGAR",
} as const;

type PaymentVendorNotifyDetails = {
  grnNo: string;
  poNumber?: string;
  itemName?: string;
  qty?: string | number;
  paymentTermsDays?: string | number;
  plannedPaymentDate?: string;
};

function formatPaymentDueLines(details: PaymentVendorNotifyDetails): string {
  const terms =
    details.paymentTermsDays != null && details.paymentTermsDays !== ""
      ? `${details.paymentTermsDays} Days`
      : "—";

  return `*Payment Terms:* ${terms}
*Payment Due Date:* ${details.plannedPaymentDate || "—"}`;
}

async function sendPaymentVendorNotification(
  phone: string,
  options: {
    title: string;
    message: string;
    grnNo: string;
  }
) {
  const entryUrl = getPaymentVendorApprovalUrl(options.grnNo);
  const fullMessage = `${options.title}

${options.message}

👉 *Open in ERP:*
${entryUrl}`;

  return sendWhatsAppMessage(phone, fullMessage);
}

export async function notifyMdNewGrnEntry(details: PaymentVendorNotifyDetails) {
  const message = `Dear Sir,

A new GRN entry has been created and requires your approval before payment can be processed.

*GRN No:* ${details.grnNo}
*PO Number:* ${details.poNumber || "—"}
*Item:* ${details.itemName || "—"}
*Qty:* ${details.qty ?? "—"}
${formatPaymentDueLines(details)}

Thank you.`;

  return sendPaymentVendorNotification(PAYMENT_VENDOR_PHONES.MD, {
    title: "📌 *New GRN — Payment Approval Required*",
    message,
    grnNo: details.grnNo,
  });
}

export async function notifyMdGrnUpdated(details: PaymentVendorNotifyDetails) {
  const message = `Dear Sir,

A GRN entry has been updated and may require your review before payment can be processed.

*GRN No:* ${details.grnNo}
*PO Number:* ${details.poNumber || "—"}
*Item:* ${details.itemName || "—"}
*Qty:* ${details.qty ?? "—"}
${formatPaymentDueLines(details)}

Thank you.`;

  return sendPaymentVendorNotification(PAYMENT_VENDOR_PHONES.MD, {
    title: "📌 *GRN Updated — Payment Approval Required*",
    message,
    grnNo: details.grnNo,
  });
}

export async function notifyUserPaymentApproved(details: PaymentVendorNotifyDetails) {
  const message = `Dear ${PAYMENT_VENDOR_PHONES.PAYMENT_USER_NAME},

MD has approved the following GRN for vendor payment. Please mark it as *Payed* once payment is completed.

*GRN No:* ${details.grnNo}
*Item:* ${details.itemName || "—"}
*Qty:* ${details.qty ?? "—"}
${formatPaymentDueLines(details)}

Thank you.`;

  return sendPaymentVendorNotification(PAYMENT_VENDOR_PHONES.PAYMENT_USER, {
    title: "✅ *Payment Approved — Mark as Payed*",
    message,
    grnNo: details.grnNo,
  });
}
