"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, CheckCircle } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function ContextUploader() {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setUploading(true);
    setSuccess(false);
    const formData = new FormData();
    formData.append("document", e.target.files[0]);

    try {
      const token = await getToken();
      const res = await fetch("http://localhost:3001/upload-context", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to embed document into Vector DB.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 border rounded-xl bg-indigo-50/50 space-y-4">
        <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
                <h3 className="font-semibold text-slate-800">Knowledge Base (RAG)</h3>
                <p className="text-xs text-slate-500">Upload internal PDFs (Schedules, Reports)</p>
            </div>
        </div>
        
        {success ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-3 rounded">
                <CheckCircle className="w-4 h-4" /> Embedded in Vector DB
            </div>
        ) : (
            <div className="relative">
                <Button disabled={uploading} variant="outline" className="w-full bg-white">
                    {uploading ? "Embedding Vectors..." : "Upload PDF Context"}
                </Button>
                <Input 
                    type="file" 
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
            </div>
        )}
    </div>
  );
}