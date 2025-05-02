"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabbedInterfaceProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
  preserveInUrl?: boolean;
  urlParam?: string;
  loadingState?: boolean;
  onChange?: (value: string) => void;
}

export function TabbedInterface({
  tabs,
  defaultTab,
  className,
  preserveInUrl = false,
  urlParam = "tab",
  loadingState = false,
  onChange,
}: TabbedInterfaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get tab from URL if preserveInUrl is true
  const tabInUrl = preserveInUrl ? searchParams.get(urlParam) : null;
  
  // Set active tab based on URL or default
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (tabInUrl && tabs.some(tab => tab.id === tabInUrl)) {
      return tabInUrl;
    }
    return defaultTab || tabs[0]?.id || "";
  });

  // Update URL when tab changes if preserveInUrl is true
  useEffect(() => {
    if (preserveInUrl && activeTab) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(urlParam, activeTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeTab, preserveInUrl, pathname, router, searchParams, urlParam]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={handleTabChange}
      className={cn("w-full", className)}
    >
      <div className="border-b mb-4">
        <TabsList className="h-10 bg-transparent">
          {loadingState ? (
            // Loading skeleton for tabs
            <>
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-24 ml-2 rounded-full" />
              <Skeleton className="h-8 w-24 ml-2 rounded-full" />
            </>
          ) : (
            // Actual tabs
            tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
              </TabsTrigger>
            ))
          )}
        </TabsList>
      </div>

      {loadingState ? (
        // Loading skeleton for content
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full mt-4" />
        </div>
      ) : (
        // Actual content
        tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            {tab.content}
          </TabsContent>
        ))
      )}
    </Tabs>
  );
} 