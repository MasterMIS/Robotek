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
  quantityChecked?: boolean;
  qualityChecked?: boolean;
};

function formatPaymentDueLines(details: PaymentVendorNotifyDetails): string {
  const terms =
    details.paymentTermsDays != null && details.paymentTermsDays !== ""
      ? `${details.paymentTermsDays} Days`
      : "—";

  return `*Payment Terms:* ${terms}
*Payment Due Date:* ${details.plannedPaymentDate || "—"}`;
}

function formatCheckLines(details: PaymentVendorNotifyDetails): string {
  const qtyLine = details.quantityChecked ? "✅ Done" : "⏳ Pending";
  const qualityLine = details.qualityChecked ? "✅ Done" : "⏳ Pending";
  return `*Quantity check (Step 1):* ${qtyLine}
*Quality check (Step 3):* ${qualityLine}`;
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

function buildMdApprovalBody(details: PaymentVendorNotifyDetails, intro: string): string {
  return `Dear Sir,

${intro}

*GRN No:* ${details.grnNo}
*PO Number:* ${details.poNumber || "—"}
*Item:* ${details.itemName || "—"}
*Qty:* ${details.qty ?? "—"}
${formatCheckLines(details)}
${formatPaymentDueLines(details)}

Thank you.`;
}

/** Sent when GRN Step 3 (Quality check) is completed — after Quantity check (Step 1). */
export async function notifyMdGrnReadyForApproval(
  details: PaymentVendorNotifyDetails,
  phone: string = PAYMENT_VENDOR_PHONES.MD
) {
  const message = buildMdApprovalBody(
    {
      ...details,
      quantityChecked: details.quantityChecked ?? true,
      qualityChecked: details.qualityChecked ?? true,
    },
    "Quantity check (Step 1) and Quality check (Step 3) have been completed.\nThis GRN now requires your approval before payment can be processed."
  );

  return sendPaymentVendorNotification(phone, {
    title: "📌 *GRN Ready for Payment Approval*",
    message,
    grnNo: details.grnNo,
  });
}

export async function notifyMdNewGrnEntry(details: PaymentVendorNotifyDetails) {
  return notifyMdGrnReadyForApproval(details);
}

export async function notifyMdGrnUpdated(details: PaymentVendorNotifyDetails) {
  const message = buildMdApprovalBody(
    details,
    "A GRN entry has been updated and may require your review before payment can be processed."
  );

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
