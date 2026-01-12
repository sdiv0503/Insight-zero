"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud } from "lucide-react";

export default function FileUpload({ onAnalysisComplete }: { onAnalysisComplete: (data: any) => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    setUploading(true);
    
    // We need to use FormData to send files
    const formData = new FormData();
    formData.append("dataset", file);

    try {
      // Note: We need the clerk token here too, but for simplicity in this component
      // we will rely on the parent or a context. 
      // ACTUALLY: Let's fetch the token properly.
      const token = await (window as any).Clerk?.session?.getToken();
      
      const res = await fetch("http://localhost:3001/upload-analysis", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData, // Auto-sets Content-Type to multipart/form-data
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onAnalysisComplete(data.insight);
      
    } catch (err) {
      console.error(err);
      alert("Analysis Failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative">
      <Input 
        type="file" 
        accept=".csv"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
      />
      <div className="flex flex-col items-center gap-2">
        <UploadCloud className="h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">
            {uploading ? "Uploading & Analyzing..." : "Click to Upload CSV"}
        </p>
        <p className="text-xs text-slate-500">Supports: date, revenue, notes</p>
      </div>
    </div>
  );
}