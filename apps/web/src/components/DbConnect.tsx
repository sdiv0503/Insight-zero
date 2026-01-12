"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function DbConnect({ onAnalysisComplete }: { onAnalysisComplete: (data: any) => void }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connStr, setConnStr] = useState("postgresql://admin:password123@localhost:5432/insight_zero");
  const [query, setQuery] = useState("SELECT date, revenue FROM sales_data LIMIT 30");

  const handleConnect = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:3001/connect-db-analysis", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ connection_string: connStr, query: query }),
      });

      if (!res.ok) throw new Error("Connection failed");
      const data = await res.json();
      onAnalysisComplete(data.insight);
      
    } catch (err) {
      console.error(err);
      alert("DB Connection Failed. Check your string and query.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-xl bg-slate-50 space-y-4">
        <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-700">Live Database Connector</h3>
        </div>
        
        <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">Connection String (Postgres)</label>
            <Input 
                value={connStr} 
                onChange={(e) => setConnStr(e.target.value)} 
                placeholder="postgresql://user:pass@host:5432/db" 
                className="bg-white font-mono text-xs"
            />
        </div>

        <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500">SQL Query</label>
            <Input 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                placeholder="SELECT date, revenue FROM table" 
                className="bg-white font-mono text-xs"
            />
        </div>

        <Button onClick={handleConnect} disabled={loading} className="w-full">
            {loading ? "Querying & Analyzing..." : "Connect & Analyze"}
        </Button>
    </div>
  );
}