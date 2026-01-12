"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import InsightChart from "@/components/InsightChart";
import MetricCard from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import FileUpload from "@/components/FileUpload";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import DbConnect from "@/components/DbConnect";

export default function Dashboard() {
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runSimulation = async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:3001/start-analysis", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ data_source: "simulate_financial_data" }),
      });
      const data = await res.json();
      setReport(data.insight);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisComplete = (data: any) => {
      setReport(data);
      setLoading(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Steward Dashboard</h1>
          <p className="text-muted-foreground">Autonomous Anomaly Detection</p>
        </div>
      </div>

      {/* Input Grid: Upload | DB Connect | Demo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. File Upload */}
        <div onClick={() => setLoading(true)}> 
             <FileUpload onAnalysisComplete={handleAnalysisComplete} />
        </div>

        {/* 2. Live Database Connector (NEW) */}
        <DbConnect onAnalysisComplete={handleAnalysisComplete} />
        
        {/* 3. Demo Mode */}
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition">
             <div className="text-center space-y-3">
                <p className="text-sm font-medium text-slate-700">Quick Demo</p>
                <Button onClick={runSimulation} disabled={loading} variant="outline" className="w-full">
                    {loading ? "Agent Working..." : "Run Simulation"}
                </Button>
                <p className="text-xs text-slate-400">Mock Data Mode</p>
             </div>
        </div>
      </div>

      {/* Loading & Results Area */}
      {loading ? (
        <DashboardSkeleton />
      ) : report ? (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard 
                    title="Anomalies Found" 
                    value={report.anomalies_found.toString()} 
                    status={report.anomalies_found > 0 ? "bad" : "good"} 
                />
                <MetricCard 
                    title="Data Quality" 
                    value="98.5%" 
                    status="good" 
                />
                <MetricCard 
                    title="Privacy Status" 
                    value="Protected" 
                    status="good" 
                />
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <div className="col-span-4">
                    <InsightChart 
                        fullTrend={report.full_trend || report.details} 
                        outliers={report.details} 
                    />
                </div>
                
                <div className="col-span-3 space-y-4">
                    <div className="border rounded-xl p-6 bg-slate-50 h-full">
                        <h3 className="font-semibold mb-4">Agent Insights</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto">
                            {report.details.map((item: any, i: number) => (
                                <div key={i} className="flex gap-4 p-3 bg-white rounded border shadow-sm">
                                    <div className="w-1 bg-red-500 rounded-full shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xs text-slate-500">{item.date}</span>
                                            <Badge variant="destructive" className="text-[10px]">HIGH SEVERITY</Badge>
                                            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">{item.confidence || "N/A"}</Badge>
                                        </div>
                                        <p className="text-sm mt-1 font-medium">{item.description}</p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            Expected Range: {item.expected_range}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="p-4 border border-green-200 bg-green-50 rounded text-xs font-mono text-green-800">
                <strong>PRIVACY AUDIT:</strong> {report.privacy_audit || "No PII detected in this dataset."}
            </div>
        </div>
      ) : (
        <div className="h-[200px] border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-slate-50/30">
            Select a data source above to begin analysis.
        </div>
      )}
    </div>
  );
}