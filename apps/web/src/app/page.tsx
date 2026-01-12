"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import InsightChart from "@/components/InsightChart";
import MetricCard from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";

// Helper to transform Python data for Recharts
const transformData = (rawJson: any) => {
  // We need to merge the "details" (anomalies) back into the full timeline
  // For this week, we will just simulate the full timeline based on the anomaly logic
  // In Week 4, we will pass the FULL dataset. 
  // For now, let's create a visualization of the data we have.
  return rawJson.details.map((d: any) => ({
      date: d.date,
      revenue: d.actual_value,
      isAnomaly: true
  }));
};

export default function Dashboard() {
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runAnalysis = async () => {
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Steward Dashboard</h1>
          <p className="text-muted-foreground">Autonomous Anomaly Detection</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} size="lg">
          {loading ? "Agent Working..." : "Run New Analysis"}
        </Button>
      </div>

      {report ? (
        <div className="space-y-6">
            {/* Top Metrics Row */}
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

            {/* Main Chart Area */}
            <div className="grid gap-4 md:grid-cols-7">
                <div className="col-span-4">
                    {/* We pass the 'details' array as data for now */}
                    <InsightChart data={report.details} outliers={report.details} />
                </div>
                
                {/* Insights Side Panel */}
                <div className="col-span-3 space-y-4">
                    <div className="border rounded-xl p-6 bg-slate-50">
                        <h3 className="font-semibold mb-4">Agent Insights</h3>
                        <div className="space-y-4">
                            {report.details.map((item: any, i: number) => (
                                <div key={i} className="flex gap-4 p-3 bg-white rounded border shadow-sm">
                                    <div className="w-1 bg-red-500 rounded-full" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-slate-500">{item.date}</span>
                                            <Badge variant="destructive">HIGH SEVERITY</Badge>
                                        </div>
                                        <p className="text-sm mt-1">{item.description}</p>
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
            
            {/* Privacy Log */}
            <div className="p-4 border border-green-200 bg-green-50 rounded text-xs font-mono text-green-800">
                <strong>PRIVACY AUDIT:</strong> {report.privacy_audit}
            </div>
        </div>
      ) : (
        <div className="h-96 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground">
            No analysis loaded. Click "Run New Analysis" to start.
        </div>
      )}
    </div>
  );
}