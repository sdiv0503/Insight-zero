"use client";
import { Clock, Zap, DollarSign, Database } from "lucide-react";

export default function CostMonitor({ ops }: { ops: any }) {
    if (!ops) return null;

    return (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-700 shadow-xl">
            <h4 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Enterprise Telemetry & FinOps
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> Pipeline Latency</p>
                    <p className="text-lg font-mono font-bold text-white">{ops.processing_time_sec}s</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Zap className="w-3 h-3"/> AI Tokens Burned</p>
                    <p className="text-lg font-mono font-bold text-amber-400">{ops.llm_tokens_used}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Cost (GPT-4 Eq.)</p>
                    <p className="text-lg font-mono font-bold text-red-400 line-through">{ops.equivalent_openai_cost}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-emerald-400 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Actual Cost</p>
                    <p className="text-lg font-mono font-bold text-emerald-400">{ops.actual_cost}</p>
                </div>
            </div>
        </div>
    );
}