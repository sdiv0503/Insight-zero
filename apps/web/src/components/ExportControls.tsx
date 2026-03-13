"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Presentation as PptIcon, Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export default function ExportControls({ report, targetId }: { report: any, targetId: string }) {
  const { getToken } = useAuth();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPpt, setDownloadingPpt] = useState(false);

  // 1. Generate PDF using modern html-to-image
  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const element = document.getElementById(targetId);
      if (!element) return;

      // Use html-to-image which natively supports lab() and oklch() CSS colors
      const dataUrl = await toPng(element, { 
          quality: 1, 
          pixelRatio: 2,
          backgroundColor: '#ffffff' // Ensure a white background is preserved
      });
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Calculate aspect ratio using the original DOM element's dimensions
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;
      const pdfHeight = (elementHeight * pdfWidth) / elementWidth;
      
      pdf.addImage(dataUrl, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save("Insight-Zero_Dashboard_Report.pdf");
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 2. Fetch the Base64 PPTX
  const handleDownloadPPT = async () => {
    setDownloadingPpt(true);
    try {
        const token = await getToken();
        
        // Sort anomalies to find the most severe one (matches Python logic)
        const sortedAnomalies = [...(report.details || [])].sort((a, b) => {
            if (a.severity === 'HIGH' && b.severity !== 'HIGH') return -1;
            if (a.severity !== 'HIGH' && b.severity === 'HIGH') return 1;
            return a.actual_value - b.actual_value; // Prioritize lowest revenue crash
        });
        
        const primaryAnomaly = sortedAnomalies[0] || {};
        
        const res = await fetch("http://localhost:3001/export-slide", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({
                anomaly_date: primaryAnomaly.date || "Unknown Date",
                revenue: primaryAnomaly.actual_value?.toString() || "0",
                confidence: primaryAnomaly.confidence || "N/A",
                root_cause: report.root_cause_analysis || "No root cause identified."
            }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Convert Base64 back to file
        const byteCharacters = atob(data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
        
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = data.filename;
        link.click();
    } catch (err) {
        console.error("PPTX generation failed", err);
        alert("Failed to generate boardroom slide.");
    } finally {
        setDownloadingPpt(false);
    }
  };

  return (
    <div className="flex gap-4">
      <Button onClick={handleDownloadPDF} disabled={downloadingPdf} variant="outline" className="flex items-center gap-2 bg-white">
        {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Export PDF Report
      </Button>
      <Button onClick={handleDownloadPPT} disabled={downloadingPpt} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
        {downloadingPpt ? <Loader2 className="w-4 h-4 animate-spin" /> : <PptIcon className="w-4 h-4" />}
        Generate Executive Slide
      </Button>
    </div>
  );
}