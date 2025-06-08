"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface TagData {
  name: string;
  count: number;
  passRate: number; // 0 to 1
}

interface TagHeatmapProps {
  tags: TagData[];
  title: string;
  description?: string;
}

export function TagHeatmap({
  tags,
  title,
  description = "Tag usage and pass rate heatmap",
}: TagHeatmapProps) {
  // Sort tags by count (descending)
  const sortedTags = [...tags].sort((a, b) => b.count - a.count);

  // Helper function to determine color based on pass rate
  const getPassRateColor = (passRate: number) => {
    if (passRate >= 0.9) return 'bg-green-300';
    if (passRate >= 0.75) return 'bg-green-200';
    if (passRate >= 0.6) return 'bg-yellow-200';
    if (passRate >= 0.4) return 'bg-yellow-300';
    if (passRate >= 0.25) return 'bg-orange-200';
    return 'bg-red-200';
  };

  // Helper function to get text color based on background
  const getTextColor = (passRate: number) => {
    return passRate >= 0.6 ? 'text-gray-900' : 'text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedTags.map((tag) => (
            <div
              key={tag.name}
              className={`flex flex-col items-center justify-center rounded-xl shadow-sm transition-all duration-150 ${getPassRateColor(tag.passRate)} ${getTextColor(tag.passRate)}`}
              style={{ minHeight: '90px', height: '110px', padding: '0.75rem' }}
            >
              <div className="font-semibold text-lg mb-1 text-center w-full">{tag.name}</div>
              <div className="text-sm opacity-90 text-center w-full">Count: {tag.count}</div>
              <div className="text-sm opacity-90 text-center w-full">{Math.round(tag.passRate * 100)}% pass</div>
            </div>
          ))}
        </div>
        {tags.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No tags data available
          </div>
        )}
      </CardContent>
    </Card>
  );
} 