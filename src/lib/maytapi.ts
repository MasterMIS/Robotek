/**
 * Maytapi WhatsApp API implementation
 * 
 * Logic based on user's Google Apps Script reference.
 * Automatically handles 10-digit Indian numbers by prepending "91".
 */

export async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  const productId = process.env.MAYTAPI_PRODUCT_ID;
  const token = process.env.MAYTAPI_TOKEN;
  const phoneId = process.env.MAYTAPI_PHONE_ID;

  if (!productId || !token || !phoneId) {
    console.error("Missing Maytapi credentials in environment variables");
    return { success: false, error: "Configuration error" };
  }

  // Prepend 91 for Indian 10-digit numbers
  let formattedPhone = phoneNumber.replace(/\D/g, "");
  if (formattedPhone.length === 10) {
    formattedPhone = "91" + formattedPhone;
  }

  const url = `https://api.maytapi.com/api/${productId}/${phoneId}/sendMessage?token=${token}`;

  const payload = {
    to_number: formattedPhone,
    type: "text",
    message: message,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store"
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
