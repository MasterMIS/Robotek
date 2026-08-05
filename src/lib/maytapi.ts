/**
 * Maytapi WhatsApp API implementation
 *
 * Logic based on user's Google Apps Script reference.
 * Automatically handles 10-digit Indian numbers by prepending "91".
 */

function formatPhoneNumber(phoneNumber: string): string {
  let formattedPhone = phoneNumber.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = "91" + formattedPhone;
  }
  return formattedPhone;
}

async function sendMaytapiPayload(payload: Record<string, unknown>) {
  const productId = process.env.MAYTAPI_PRODUCT_ID;
  const token = process.env.MAYTAPI_TOKEN;
  const phoneId = process.env.MAYTAPI_PHONE_ID;

  if (!productId || !token || !phoneId) {
    console.error("Missing Maytapi credentials in environment variables");
    return { success: false, error: "Configuration error" };
  }

  const url = `https://api.maytapi.com/api/${productId}/${phoneId}/sendMessage?token=${token}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Maytapi API Error:", data);
      return { success: false, error: data.message || "Failed to send message" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error calling Maytapi API:", error);
    return { success: false, error: "Network error" };
  }
}

export async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  return sendMaytapiPayload({
    to_number: formatPhoneNumber(phoneNumber),
    type: "text",
    message,
  });
}

/** Interactive WhatsApp message with a URL button (cleaner than showing a long link). */
export async function sendWhatsAppUrlButtonMessage(
  phoneNumber: string,
  options: {
    title?: string;
    message: string;
    buttonText: string;
    buttonUrl: string;
    footer?: string;
  }
) {
  const payload: Record<string, unknown> = {
    to_number: formatPhoneNumber(phoneNumber),
    type: "buttons",
    message: options.message,
    buttons: [
      {
        type: "url",
        text: options.buttonText,
        url: options.buttonUrl,
      },
    ],
  };

  if (options.title) payload.buttonTitle = options.title;
  if (options.footer) payload.buttonFooter = options.footer;

  const result = await sendMaytapiPayload(payload);

  if (!result.success) {
    console.warn("[maytapi] Button message failed, falling back to text:", result.error);
    return sendWhatsAppMessage(
      phoneNumber,
      `${options.message}\n\n${options.buttonText}: ${options.buttonUrl}`
    );
  }

  return result;
}
