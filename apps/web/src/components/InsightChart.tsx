"use client";
import { useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine // Changed from ReferenceArea
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Removed DialogDescription import to avoid confusion

export default function InsightChart({ fullTrend, outliers }: { fullTrend: any[], outliers: any[] }) {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  const handleDotClick = (dotProps: any) => {
      const clickedData = dotProps.payload; 
      const anomaly = outliers.find(o => o.date === clickedData.date);
      if (anomaly) {
          setSelectedPoint(anomaly);
      }
  };

  return (
    <>
      <Card className="w-full h-[400px]">
        <CardHeader>
          <CardTitle>Revenue Trend (Click Blue Dots for Details)</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fullTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis />
              <Tooltip />
              
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#2563eb" 
                strokeWidth={2} 
                activeDot={{ 
                    r: 8, 
                    onClick: (e, payload) => handleDotClick(payload),
                    cursor: 'pointer' 
                }}
              />
              
              {/* FIXED: Use ReferenceLine with thick stroke instead of Area */}
              {outliers.map((outlier, idx) => (
                 <ReferenceLine 
                   key={idx} 
                   x={outlier.date} 
                   stroke="red" 
                   strokeOpacity={0.2}
                   strokeWidth={40} // Creates a wide vertical band
                 />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPoint} onOpenChange={() => setSelectedPoint(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Anomaly Detected: {selectedPoint?.date}</DialogTitle>
                
                {/* FIXED: Replaced DialogDescription with a simple div to prevent <p> nesting errors */}
                <div className="space-y-2 pt-4 text-sm text-muted-foreground">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-100 rounded text-black">
                            <span className="text-xs text-slate-500">Actual Revenue</span>
                            <p className="text-xl font-bold">${selectedPoint?.actual_value}</p>
                        </div>
                        <div className="p-3 bg-slate-100 rounded text-black">
                            <span className="text-xs text-slate-500">Confidence</span>
                            <p className="text-xl font-bold text-blue-600">{selectedPoint?.confidence || "N/A"}</p>
                        </div>
                    </div>
                    <div className="p-3 border border-red-200 bg-red-50 rounded">
                        <span className="text-xs font-bold text-red-700">AI Analysis:</span>
                        <p className="text-sm text-red-800 mt-1">{selectedPoint?.description}</p>
                        <p className="text-xs text-red-600 mt-1">Detection Logic: {selectedPoint?.detection_method}</p>
                    </div>
                </div>

            </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}