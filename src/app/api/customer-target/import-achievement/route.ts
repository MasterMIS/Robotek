import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { importAchievementForMonth } from "@/lib/customer-target-sheets";
import { isMonthName, parseAmount } from "@/lib/customer-target-messages";
import { MonthName } from "@/types/customer-target";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session.user as any).role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "EA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const month = body.month as string;
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!isMonthName(month)) {
      return NextResponse.json({ error: "Invalid month. Select a valid month before import." }, { status: 400 });
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    const normalized = rows
      .map((r: any) => ({
        accountName: String(r.accountName || r["Account Name"] || "").trim(),
        nettSaleAmt: parseAmount(r.nettSaleAmt ?? r["Nett Sale Amt."] ?? r["Nett Sale Amt"] ?? 0),
      }))
      .filter((r: { accountName: string }) => r.accountName);

    if (normalized.length === 0) {
      return NextResponse.json({
        error: "No valid rows. Expected headers: Account Name, Nett Sale Amt.",
      }, { status: 400 });
    }

    const result = await importAchievementForMonth(month as MonthName, normalized);

    return NextResponse.json({
      success: true,
      month,
      ...result,
    });
  } catch (error: any) {
    console.error("Achievement import error:", error);
    return NextResponse.json({ error: error.message || "Import failed" }, { status: 500 });
  }
}
