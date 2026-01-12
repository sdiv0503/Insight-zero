import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Area */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4 h-[400px] p-6">
           <Skeleton className="h-full w-full" />
        </Card>
        <Card className="col-span-3 h-[400px] p-6 space-y-4">
           <Skeleton className="h-6 w-[150px]" />
           <Skeleton className="h-20 w-full" />
           <Skeleton className="h-20 w-full" />
        </Card>
      </div>
    </div>
  );
}