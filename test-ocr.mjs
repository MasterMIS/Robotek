import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `Extract the following details from this document and return them strictly as a JSON object:
{
  "OrderNo": "order number if present",
  "Date": "date if present",
  "PartyName": "party name if present",
  "GSTIN": "GSTIN if present",
  "TotalAmount": "total amount/value if present",
  "TotalQty": "total quantity if present"
}`;

  try {
    const result = await model.generateContent([prompt, {
      inlineData: {
        data: Buffer.from("dummy data").toString("base64"),
        mimeType: "image/png"
      }
    }]);
    console.log(result.response.text());
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
