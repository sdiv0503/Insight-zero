"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { UploadCloud, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function FileUpload({
  onAnalysisComplete,
}: {
  onAnalysisComplete: (data: any) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { getToken, isSignedIn } = useAuth(); // Much safer than window.Clerk

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !isSignedIn) return;

    const file = e.target.files[0];
    setUploading(true);

    // Backend multer expects the field name to be 'file'
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = await getToken();

      const res = await fetch("http://localhost:3001/upload-analysis", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      
      // WEEK 7 LOGIC: If we get a jobId back, we pass it up to start polling!
      if (data.jobId) {
          onAnalysisComplete(data.jobId);
      } else {
          // Fallback just in case
          onAnalysisComplete(data.insight || data);
      }
      
    } catch (err) {
      console.error(err);
      alert("Analysis Failed. Ensure servers are running.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative h-full flex flex-col justify-center">
      <Input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={uploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex flex-col items-center gap-2">
        {uploading ? (
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        ) : (
            <UploadCloud className="h-10 w-10 text-slate-400" />
        )}
        <p className="text-sm font-medium text-slate-700">
          {uploading ? "Queuing Job..." : "Click to Upload CSV"}
        </p>
        <p className="text-xs text-slate-500">Supports: date, revenue, notes</p>
      </div>
    </div>
  );
}