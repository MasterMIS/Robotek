import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/maytapi';

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();
    if (!phone || !message) {
      return NextResponse.json({ success: false, error: 'Missing phone or message' }, { status: 400 });
    }
    const result = await sendWhatsAppMessage(phone, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in send-whatsapp API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
