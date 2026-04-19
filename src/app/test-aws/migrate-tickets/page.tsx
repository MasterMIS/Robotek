'use client'

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

export default function MigrateTicketsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  async function startTicketMigration() {
    setStatus('running');
    addLog('🚀 Starting migration of HELP TICKETS from Google Sheets to AWS...');

    try {
      // 1. Fetch data from existing Google Sheets API (Legacy endpoint)
      addLog('📡 Fetching data from legacy sheets...');
      const res = await fetch('/api/tickets/legacy-migration');
      if (!res.ok) throw new Error('Failed to fetch legacy tickets');
      const { tickets, history } = await res.json();
      addLog(`✅ Found ${tickets.length} tickets and ${history.length} history logs.`);

      // 2. Migrate Tickets
      addLog('📤 Uploading tickets to DynamoDB...');
      for (const t of tickets) {
        addLog(`Processing Ticket [${t.id}] ${t.title}...`);
        
        await client.models.HelpTicket.create({
          id: String(t.id),
          title: t.title || '',
          description: t.description || '',
          category: t.category || '',
          priority: t.priority || '',
          raised_by: t.raised_by || '',
          solver_person: t.solver_person || '',
          planned_resolution: t.planned_resolution || '',
          status: t.status || '',
          attachment_url: t.attachment_url || '',
          voice_note: t.voice_note || '',
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString(),
        });
      }
      addLog(`✅ ${tickets.length} tickets migrated.`);

      // 3. Migrate History
      addLog('📤 Uploading history logs...');
      let historyCount = 0;
      for (const h of history) {
        // Skip logs that don't have a valid ticket_id
        if (!h.ticket_id) continue;
        
        // Match legacy action_type or default to COMMENT
        // Legacy: 'STATUS_CHANGE' | 'COMMENT'
        await client.models.HelpTicketHistory.create({
          ticket_id: String(h.ticket_id),
          action_type: h.action_type || 'COMMENT',
          actor_username: h.actor_username || 'System',
          old_status: h.old_status || '',
          new_status: h.new_status || '',
          comment_text: h.comment_text || '',
          attachment_url: h.attachment_url || '',
          voice_note: h.voice_note || '',
          created_at: h.created_at || new Date().toISOString(),
        });
        historyCount++;
        if (historyCount % 10 === 0) addLog(`Progress: ${historyCount} logs uploaded...`);
      }
      addLog(`✅ ${historyCount} history logs migrated.`);
      
      setStatus('success');
      addLog('🎉 TICKET MIGRATION COMPLETE!');

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      addLog(`❌ ERROR: ${err.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#001529] text-blue-400 p-8 font-mono">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 border-b border-blue-800 pb-2 text-white">Help Ticket Migration Tool</h1>
        
        <div className="mb-6">
          <p className="text-gray-400 mb-6 text-sm">
            This tool will migrate all tickets and action logs from Google Sheets to AWS DynamoDB.
            <br/> Ensure the current Amplify schema in <b>resource.ts</b> includes <b>HelpTicket</b> and <b>HelpTicketHistory</b>.
          </p>
          
          <div className="flex gap-4 mb-8">
            <button
              onClick={startTicketMigration}
              disabled={status === 'running'}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              🚀 Migrate All Tickets & History
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-blue-800 text-blue-400 rounded-lg hover:bg-blue-900/30 font-bold transition-all"
            >
              Back
            </button>
          </div>

          <div className="bg-black/80 p-6 rounded-xl border border-blue-900 h-[500px] overflow-y-auto custom-scrollbar shadow-inner">
            {logs.map((log, i) => (
              <div key={i} className={`mb-1.5 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : ''}`}>
                <span className="opacity-50 mr-2 text-[10px]">{log.split(': ')[0]}</span>
                <span>{log.substring(log.indexOf(': ') + 2)}</span>
              </div>
            ))}
            {status === 'idle' && <div className="text-gray-600 animate-pulse">Waiting to start...</div>}
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
           <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-1">Warning</p>
           <p className="text-xs text-yellow-600/80 italic">Do not close this tab while migration is in progress. Check the console for detailed transaction logs if an error occurs.</p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e3a8a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #2563eb; }
      `}</style>
    </div>
  );
}
