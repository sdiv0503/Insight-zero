"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InsightChart({ data, outliers }: { data: any[], outliers: any[] }) {
  return (
    <Card className="w-full h-[400px]">
      <CardHeader>
        <CardTitle>Revenue Trend Analysis</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{fontSize: 12}} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
            
            {/* Highlight the Anomaly Zones */}
            {outliers.map((outlier, idx) => (
               <ReferenceArea 
                 key={idx} 
                 x1={outlier.date} 
                 x2={outlier.date} 
                 stroke="red" 
                 strokeOpacity={0.3}
                 fill="red" 
                 fillOpacity={0.1} 
               />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}