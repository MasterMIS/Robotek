import { sendWhatsAppMessage } from "./maytapi";
import { O2D } from "@/types/o2d";

const NOTIFICATION_RECIPIENTS = ["7217685179", "8920615702", "7988775751"];

/**
 * Sends a WhatsApp notification for O2D order remarks.
 * Focuses on item specification remarks and order-level notes.
 */
/**
 * Sends a WhatsApp notification for O2D order actions.
 * Focuses on item specification remarks and order-level notes.
 */
export async function sendO2DRemarkNotification(
  o2dData: O2D | O2D[],
  action: string = "Updated"
) {
  try {
    const records = Array.isArray(o2dData) ? o2dData : [o2dData];
    if (records.length === 0 && action !== "Deleted") return;

    const first = records[0] || {} as O2D;
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

    // If no remarks at all (item specs or order note), don't send anything for Created/Updated
    const hasOrderNote = orderRemark && orderRemark !== "-" && orderRemark.toLowerCase() !== "n/a" && orderRemark.trim() !== "";
    
    if (action !== "Deleted" && !itemRemarks && !hasOrderNote) {
      console.log(`No significant remarks for Order ${orderNo}, skipping notification.`);
      return;
    }

    const actionEmoji = action === "Created" ? "📝" : action === "Updated" ? "🔄" : "🗑️";
    let message = `Order ${action} ${actionEmoji}🚨⚠️\n\n`;
    message += `Hello Manish Sir,\n\n`;
    message += `Order Num :- ${orderNo}\n`;
    message += `Party Name :- ${partyName}\n\n`;

    if (action === "Deleted") {
      message += `This order has been DELETED from the system.\n`;
    } else {
      message += `Remarks for order are Following :-\n`;
      
      if (itemRemarks) {
        message += itemRemarks;
      }
      
      if (hasOrderNote) {
        // Add a separator if item remarks were already added
        if (itemRemarks) message += `\n`;
        message += `Order Note :- ${orderRemark}\n`;
      }

      message += `\nPlease consider these remarks for final order dispatching\n`;
    }

    message += `\nThanks and Regards`;

    for (const phone of NOTIFICATION_RECIPIENTS) {
      const result = await sendWhatsAppMessage(phone, message);
      if (!result.success) {
        console.error(`Failed to send O2D WhatsApp notification to ${phone}: ${result.error}`);
      }
    }
    console.log(`O2D Remark notification sent for Order ${orderNo}`);
  } catch (error) {
    console.error("Error sending O2D WhatsApp notification:", error);
  }
}
