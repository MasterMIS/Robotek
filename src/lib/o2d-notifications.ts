import { sendWhatsAppMessage } from "./maytapi";
import { O2D } from "@/types/o2d";

const NOTIFICATION_RECIPIENT = "7217685179";

/**
 * Sends a WhatsApp notification for O2D order remarks.
 * Focuses on item specification remarks and order-level notes.
 */
export async function sendO2DRemarkNotification(o2dData: O2D | O2D[]) {
  try {
    const records = Array.isArray(o2dData) ? o2dData : [o2dData];
    if (records.length === 0) return;

    const first = records[0];
    const orderNo = first.order_no || "Unknown";
    const partyName = first.party_name || "Unknown";
    const orderRemark = first.remark;

    // Extract item remarks
    let itemRemarks = "";
    records.forEach((record) => {
      if (record.item_name && record.item_specification) {
        // If item_name has multiple items (separated by |), we should split them
        if (record.item_name.includes(" | ")) {
          const names = record.item_name
            .split(" | ")
            .map((s) => s.replace(/^\d+\.\s*/, "").trim());
          const specs = (record.item_specification || "")
            .split(" | ")
            .map((s) => s.replace(/^\d+\.\s*/, "").trim());
          
          names.forEach((name, idx) => {
            const spec = specs[idx];
            if (spec && spec !== "-" && spec.toLowerCase() !== "n/a" && spec.trim() !== "") {
              itemRemarks += `${name} :- ${spec}\n`;
            }
          });
        } else {
          const spec = record.item_specification;
          if (spec && spec !== "-" && spec.toLowerCase() !== "n/a" && spec.trim() !== "") {
            itemRemarks += `${record.item_name} :- ${spec}\n`;
          }
        }
      }
    });

    // If no remarks at all (item specs or order note), don't send anything
    const hasOrderNote = orderRemark && orderRemark !== "-" && orderRemark.toLowerCase() !== "n/a" && orderRemark.trim() !== "";
    
    if (!itemRemarks && !hasOrderNote) {
      console.log(`No significant remarks for Order ${orderNo}, skipping notification.`);
      return;
    }

    let message = `Order Remarks🚨⚠️\n\n`;
    message += `Hello Manish Sir,\n\n`;
    message += `Order Num :- ${orderNo}\n`;
    message += `Party Name :- ${partyName}\n\n`;
    message += `Remarks for order are Following :-\n`;
    
    if (itemRemarks) {
      message += itemRemarks;
    }
    
    if (hasOrderNote) {
      // Add a separator if item remarks were already added
      if (itemRemarks) message += `\n`;
      message += `Order Note :- ${orderRemark}\n`;
    }

    message += `\nPlease consider these remarks for final order dispatching\n\n`;
    message += `Thanks and Regards`;

    const result = await sendWhatsAppMessage(NOTIFICATION_RECIPIENT, message);
    if (!result.success) {
      console.error(`Failed to send O2D WhatsApp notification: ${result.error}`);
    } else {
      console.log(`O2D Remark notification sent for Order ${orderNo}`);
    }
  } catch (error) {
    console.error("Error sending O2D WhatsApp notification:", error);
  }
}
