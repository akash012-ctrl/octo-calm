"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MoodCheckIn } from "@/types/mood";
import { cn } from "@/lib/utils";

interface MoodChartProps {
  checkIns: MoodCheckIn[];
  className?: string;
}

type TimeRange = "7days" | "30days" | "90days";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7days", label: "7 Days" },
  { value: "30days", label: "30 Days" },
  { value: "90days", label: "90 Days" },
];

export function MoodChart({ checkIns, className }: MoodChartProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7days");

  const chartData = React.useMemo(() => {
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    const startDate = subDays(new Date(), days);

    // Filter check-ins within the selected range
    const filteredCheckIns = checkIns.filter(
      (checkIn) => new Date(checkIn.timestamp) >= startDate
    );

    // Group by date and calculate averages
    const groupedByDate = filteredCheckIns.reduce((acc, checkIn) => {
      const dateKey = format(new Date(checkIn.timestamp), "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          moods: [],
          intensities: [],
          hasGuardrail: false,
        };
      }
      acc[dateKey].moods.push(checkIn.mood);
      acc[dateKey].intensities.push(checkIn.intensity);
      if (checkIn.crisisDetected) {
        acc[dateKey].hasGuardrail = true;
      }
      return acc;
    }, {} as Record<string, { date: string; moods: number[]; intensities: number[]; hasGuardrail: boolean }>);

    // Calculate averages and format for chart
    return Object.values(groupedByDate)
      .map((day) => ({
        date: format(new Date(day.date), "MMM d"),
        fullDate: day.date,
        mood: Number(
          (day.moods.reduce((a, b) => a + b, 0) / day.moods.length).toFixed(1)
        ),
        intensity: Number(
          (
            day.intensities.reduce((a, b) => a + b, 0) / day.intensities.length
          ).toFixed(1)
        ),
        hasGuardrail: day.hasGuardrail,
        count: day.moods.length,
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [checkIns, timeRange]);

  const averageMood = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, day) => acc + day.mood, 0);
    return Number((sum / chartData.length).toFixed(1));
  }, [chartData]);

  const averageIntensity = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, day) => acc + day.intensity, 0);
    return Number((sum / chartData.length).toFixed(1));
  }, [chartData]);

  if (checkIns.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Mood Trends</CardTitle>
          <CardDescription>Visualize your mood over time</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            No data available. Complete check-ins to see your trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Mood Trends</CardTitle>
            <CardDescription>
              Average mood: {averageMood}/5 • Average intensity:{" "}
              {averageIntensity}/10
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {TIME_RANGES.map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              className="text-xs"
              tick={{ fill: "currentColor" }}
              label={{
                value: "Mood Level",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, name: string) => {
                if (name === "mood") return [value, "Mood"];
                if (name === "intensity") return [value, "Intensity"];
                return [value, name];
              }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium mb-2">{data.date}</p>
                      <p className="text-sm">
                        Mood:{" "}
                        <span className="font-semibold">{data.mood}/5</span>
                      </p>
                      <p className="text-sm">
                        Intensity:{" "}
                        <span className="font-semibold">
                          {data.intensity}/10
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {data.count}{" "}
                        {data.count === 1 ? "check-in" : "check-ins"}
                      </p>
                      {data.hasGuardrail && (
                        <p className="text-sm text-red-500 font-medium mt-1">
                          ⚠️ Elevated concern
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <ReferenceLine
              y={averageMood}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${averageMood}`,
                position: "right",
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload, index } = props as {
                  cx: number;
                  cy: number;
                  payload: (typeof chartData)[number];
                  index: number;
                };
                return (
                  <circle
                    key={`mood-dot-${payload.fullDate ?? index}`}
                    cx={cx}
                    cy={cy}
                    r={payload.hasGuardrail ? 6 : 4}
                    fill={
                      payload.hasGuardrail
                        ? "hsl(var(--destructive))"
                        : "hsl(var(--primary))"
                    }
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="intensity"
              stroke="hsl(var(--secondary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              yAxisId={1}
            />
            <YAxis
              yAxisId={1}
              orientation="right"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              className="text-xs"
              tick={{ fill: "currentColor" }}
              label={{ value: "Intensity", angle: 90, position: "insideRight" }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend Explanation */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary" />
            <span>Mood Level</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-secondary border-dashed" />
            <span>Intensity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Elevated Concern</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
