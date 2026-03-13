"use client";
import { useState } from "react";
import { useAuth, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import InsightChart from "@/components/InsightChart";
import MetricCard from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import FileUpload from "@/components/FileUpload";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import DbConnect from "@/components/DbConnect";
import ContextUploader from "@/components/ContextUploader";
import ExportControls from "@/components/ExportControls";
import CostMonitor from "@/components/CostMonitor";
import { Loader2 } from "lucide-react";
import LandingPage from "@/components/LandingPage";

export default function Dashboard() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jobState, setJobState] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

  // THE POLLING ENGINE
  const pollJobStatus = async (jobId: string) => {
    setLoading(true);
    setJobState("waiting");
    const token = await getToken();

    const interval = setInterval(async () => {
      const res = await fetch(`http://localhost:3001/job-status/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setJobState(data.state); // 'waiting' -> 'active' -> 'completed'

      if (data.state === "completed") {
        clearInterval(interval);
        setReport(data.result);
        setLoading(false);
        setJobState(null);
      } else if (data.state === "failed") {
        clearInterval(interval);
        alert("Analysis Job Failed.");
        setLoading(false);
        setJobState(null);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleJobQueued = (jobIdOrData: any) => {
    if (typeof jobIdOrData === "string") {
      pollJobStatus(jobIdOrData);
    } else {
      setReport(jobIdOrData);
      setLoading(false);
    }
  };

  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>

      <SignedIn>
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Data Steward Dashboard
              </h1>
              <p className="text-muted-foreground">
                Autonomous Anomaly Detection
              </p>
            </div>

            {/* ADDED: User Profile Button for logging out */}
            <UserButton afterSignOutUrl="/" />
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div onClick={() => !loading && setLoading(true)}>
              <FileUpload onAnalysisComplete={handleJobQueued} />
            </div>
            <DbConnect onAnalysisComplete={handleJobQueued} />
            <ContextUploader />
          </div>

          {/* QUEUE PROGRESS BAR */}
          {jobState && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="font-semibold text-indigo-900">
                  {jobState === "waiting"
                    ? "Job in Queue..."
                    : "Engine Processing Data..."}
                </span>
              </div>
              <Badge variant="outline" className="bg-white">
                Powered by BullMQ & Redis
              </Badge>
            </div>
          )}

          {/* Loading & Results Area */}
          {loading && !jobState ? (
            <DashboardSkeleton />
          ) : report ? (
            <div className="space-y-6">
              <div className="flex justify-end">
                <ExportControls
                  report={report}
                  targetId="dashboard-capture-area"
                />
              </div>

              <div
                id="dashboard-capture-area"
                className="space-y-6 bg-white p-6 rounded-xl border shadow-sm"
              >
                {/* FinOps Cost Monitor */}
                <CostMonitor ops={report.ops_metrics} />

                {/* Metrics */}
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

                {/* Main Chart and Side Panel */}
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
                          <div
                            key={i}
                            className="flex gap-4 p-3 bg-white rounded border shadow-sm"
                          >
                            <div className="w-1 bg-red-500 rounded-full shrink-0" />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-slate-500">
                                  {item.date}
                                </span>
                                <Badge
                                  variant="destructive"
                                  className="text-[10px]"
                                >
                                  HIGH SEVERITY
                                </Badge>
                              </div>
                              <p className="text-sm mt-1 font-medium">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {report.root_cause_analysis && (
                  <div className="p-5 border border-indigo-200 bg-indigo-50 rounded-xl space-y-2">
                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                      <span>🧠</span> AI Root Cause Analysis (Llama-3)
                    </h4>
                    <p className="text-sm text-indigo-800 leading-relaxed">
                      {report.root_cause_analysis}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[200px] border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-slate-50/30">
              Select a data source above to begin analysis.
            </div>
          )}
        </div>
      </SignedIn>
    </>
  );
}
