import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDrive, O2D_UPLOADS_FOLDER_ID } from "@/lib/google-drive";
import { appendOutFormData } from "@/lib/o2d-sheets";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderNo = formData.get("orderNo") as string;
    const step = formData.get("step") as string;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileId = await uploadFileToDrive(file, O2D_UPLOADS_FOLDER_ID);
    if (!fileId) throw new Error("Failed to upload to Drive");

    // OCR Extraction for Step 5
    if (step === "5") {
      let apiKey = process.env.GEMINI_API_KEY;
      
      // Fallback: Read directly from .env.local if not in process.env (e.g. server not restarted)
      if (!apiKey) {
        try {
          const envPath = path.join(process.cwd(), ".env.local");
          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, "utf-8");
            const match = envContent.match(/GEMINI_API_KEY=(.+)/);
            if (match && match[1]) {
              apiKey = match[1].trim();
              console.log("Loaded GEMINI_API_KEY directly from .env.local");
            }
          }
        } catch (e) {
          console.error("Failed to read .env.local fallback", e);
        }
      }

      if (apiKey) {
        try {
          console.log(`Starting OCR for Order ${orderNo}...`);
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });

          const arrayBuffer = await file.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          console.log(`File converted to base64. Size: ${base64Data.length} chars. Mime: ${file.type}`);

          const prompt = `Extract the following details from this document:
{
  "OrderNo": "order number if present",
  "Date": "date if present",
  "PartyName": "party name if present",
  "LineItems": [
    {
      "Description": "description of goods",
      "Qty": "quantity",
      "Price": "price",
      "Amount": "amount"
    }
  ]
}`;

          const imageParts = [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type || "application/pdf", // fallback mime type
              },
            },
          ];

          console.log("Sending to Gemini API...");
          const result = await model.generateContent([prompt, ...imageParts]);
          const responseText = result.response.text();
          console.log("Gemini API Response:", responseText);
          
          // Parse the JSON
          const extractedData = JSON.parse(responseText);
          
          // Append to Out Form sheet
          if (orderNo) {
            console.log(`Appending to Out Form for ${orderNo}...`);
            const success = await appendOutFormData(orderNo, extractedData);
            console.log(`Append result: ${success}`);
          }
        } catch (ocrError: any) {
          console.error("OCR Extraction Error:", ocrError?.message || ocrError);
          // Continue and just return fileId even if OCR fails
          if (orderNo) {
            await appendOutFormData(orderNo, { Status: `Failed: ${ocrError?.message?.substring(0, 50) || "Unknown Error"}` });
          }
        }
      } else {
        console.warn("OCR Skipped: GEMINI_API_KEY is not configured.");
        if (orderNo) {
           await appendOutFormData(orderNo, { Status: "Failed (No API Key)" });
        }
      }
    }

    return NextResponse.json({ fileId });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload" }, { status: 500 });
  }
}
