"use client";
import { useState } from "react";

export default function MigrateDatesPage() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<any>(null);

  const run = async (dryRun: boolean) => {
    setStatus("running");
    setResult(null);
    try {
      const res = await fetch(`/api/o2d/migrate-dates?dry_run=${dryRun}`, {
        method: "POST",
      });
      const data = await res.json();
      setResult(data);
      setStatus(res.ok ? "done" : "error");
    } catch (err: any) {
      setResult({ error: err.message });
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-navy-900 rounded-3xl shadow-xl border border-gray-100 dark:border-navy-700 p-8 max-w-2xl w-full">
        <h1 className="text-2xl font-black text-[#003875] dark:text-[#FFD500] uppercase tracking-tight mb-2">
          O2D Date Migration
        </h1>
        <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-8">
          Backfill created_at / updated_at from Google Sheets → DynamoDB
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-[12px] font-bold text-amber-700">
          ⚠️ This migration reads dates from Google Sheets and writes them to DynamoDB. Run{" "}
          <strong>Dry Run</strong> first to preview what will change.
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => run(true)}
            disabled={status === "running"}
            className="flex-1 h-12 bg-gray-100 dark:bg-navy-800 text-gray-700 dark:text-gray-200 rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-navy-700 transition-all disabled:opacity-50"
          >
            {status === "running" ? "Running..." : "🔍 Dry Run (Preview)"}
          </button>
          <button
            onClick={() => {
              if (confirm("This will update DynamoDB records with dates from Google Sheets. Are you sure?")) {
                run(false);
              }
            }}
            disabled={status === "running"}
            className="flex-1 h-12 bg-[#003875] text-white rounded-2xl font-black text-[13px] uppercase tracking-widest hover:bg-[#002855] transition-all disabled:opacity-50"
          >
            {status === "running" ? "⏳ Migrating..." : "🚀 Run Migration"}
          </button>
        </div>

        {status === "running" && (
          <div className="flex items-center gap-3 text-[#003875] dark:text-[#FFD500] mb-4">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] font-black uppercase tracking-widest">
              Processing... This may take 2–5 minutes for 10,000+ records.
            </span>
          </div>
        )}

        {result && (
          <div
            className={`rounded-2xl border p-5 ${
              status === "error"
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <h2 className="text-[13px] font-black uppercase tracking-widest mb-3 text-gray-700">
              {result.message || "Result"}
            </h2>
            {result.stats && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.entries(result.stats).map(([key, val]) => (
                  <div key={key} className="bg-white rounded-xl p-3 border border-gray-100">
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest font-black">
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="text-[18px] font-black text-[#003875]">{String(val)}</div>
                  </div>
                ))}
              </div>
            )}
            {result.sample && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sample (first 10)</p>
                <pre className="text-[10px] bg-white rounded-xl p-3 overflow-auto max-h-48 font-mono border border-gray-100">
                  {JSON.stringify(result.sample, null, 2)}
                </pre>
              </div>
            )}
            {result.errors?.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">
                  Errors ({result.errors.length})
                </p>
                <pre className="text-[10px] bg-white rounded-xl p-3 overflow-auto max-h-32 font-mono border border-red-100 text-red-600">
                  {result.errors.join("\n")}
                </pre>
              </div>
            )}
            {result.error && (
              <p className="text-red-600 font-bold text-[12px]">{result.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
