import { NextResponse } from 'next/server';
import { getTickets, ticketHistoryService } from '@/lib/ticket-sheets';

export async function GET() {
  try {
    const tickets = await getTickets();
    const history = await ticketHistoryService.getAll();
    
    return NextResponse.json({
        tickets,
        history
    });
  } catch (error: any) {
    console.error("GET /api/tickets/legacy-migration error:", error);
    return NextResponse.json({ error: "Failed to fetch legacy tickets" }, { status: 500 });
  }
}
