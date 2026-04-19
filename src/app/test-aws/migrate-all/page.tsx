"use client";

import { useState } from "react";

export default function MigrateAllPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);

  const log = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const modules = [
    { name: "O2D", endpoint: "o2d" },
    { name: "I2R", endpoint: "i2r" },
    { name: "IMS", endpoint: "ims" },
    { name: "Party Management", endpoint: "party" },
    { name: "Attendance & Leave", endpoint: "attendance" },
    { name: "Score", endpoint: "score" },
    { name: "Chat", endpoint: "chat" },
    { name: "Scheduler", endpoint: "scheduler" },
    { name: "Scot", endpoint: "scot" },
  ];

  const handleMigrate = async (moduleName: string, endpoint: string) => {
    try {
      setIsMigrating(true);
      log(`Starting migration for ${moduleName}...`);
      
      const response = await fetch(`/api/migrate-data?module=${endpoint}`, {
        method: "POST",
      });
      
      const result = await response.json();
      
      if (response.ok) {
        log(`SUCCESS: Migrated ${result.count || ''} records for ${moduleName}`);
      } else {
        log(`ERROR: Failed to migrate ${moduleName} - ${result.error}`);
      }
    } catch (err: any) {
      log(`SYSTEM ERROR: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateAll = async () => {
    setIsMigrating(true);
    let currentProgress = 0;
    
    for (const mod of modules) {
      try {
        log(`Starting batch migration for ${mod.name}...`);
        const response = await fetch(`/api/migrate-data?module=${mod.endpoint}`, {
          method: "POST",
        });
        const result = await response.json();
        
        if (response.ok) {
          log(`SUCCESS: Migrated ${mod.name}`);
        } else {
          log(`ERROR: Failed to migrate ${mod.name} - ${result.error}`);
        }
      } catch (err: any) {
        log(`SYSTEM ERROR on ${mod.name}: ${err.message}`);
      }
      currentProgress++;
      setProgress(Math.round((currentProgress / modules.length) * 100));
    }
    log("BATCH MIGRATION COMPLETE.");
    setIsMigrating(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-zinc-950 min-h-screen text-zinc-100">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Master Data Migration</h1>
        <p className="text-zinc-400 mt-2">
          Sync data from legacy Google Sheets directly into AWS DynamoDB.
        </p>
      </div>

      {progress > 0 && (
        <div className="w-full bg-zinc-800 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-full mb-4">
            <button 
                onClick={handleMigrateAll}
                disabled={isMigrating}
                className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all"
            >
                {isMigrating ? "Migration in Progress..." : "MIGRATE ALL MODULES"}
            </button>
        </div>

        {modules.map((mod) => (
          <div key={mod.name} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm text-center space-y-4 hover:border-zinc-700 transition-colors">
            <h3 className="text-xl font-semibold text-white">{mod.name}</h3>
            <button
              onClick={() => handleMigrate(mod.name, mod.endpoint)}
              disabled={isMigrating}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-medium text-sm transition-colors disabled:opacity-50 border border-zinc-700 w-full"
            >
              Start Sync
            </button>
          </div>
        ))}
      </div>

      <div className="bg-black border border-zinc-800 rounded-xl p-4 overflow-hidden flex flex-col h-96">
        <h3 className="font-semibold mb-2 text-zinc-300">Migration Terminal Output</h3>
        <div className="flex-1 overflow-y-auto space-y-1 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic">No logs yet. Start a migration...</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={l.includes("ERROR") ? "text-red-400" : l.includes("SUCCESS") ? "text-green-400" : "text-zinc-300"}>
                {l}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
