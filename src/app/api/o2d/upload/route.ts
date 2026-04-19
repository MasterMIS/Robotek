import { NextRequest, NextResponse } from "next/server";
import { uploadData } from 'aws-amplify/storage';
import { Schema } from '@/../amplify/data/resource';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderNo = formData.get("orderNo") as string;
    const step = formData.get("step") as string;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const path = `o2d/steps/${orderNo || 'global'}/${step || 'other'}/${Date.now()}-${file.name}`;
    
    const { result } = await uploadData({
      path,
      data: await file.arrayBuffer(),
      options: {
        contentType: file.type,
      }
    });
    
    const uploadResult = await result;

    return NextResponse.json({ fileId: uploadResult.path });
  } catch (error: any) {
    console.error("Upload Step Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload" }, { status: 500 });
  }
}
