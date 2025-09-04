
"use client";

import { useState, useEffect } from "react";
import type { Part } from "@/lib/types";
import { initialParts, initialMachines } from "@/lib/initial-data";
import { AppHeader } from "@/components/app/app-header";
import { PartsManager } from "@/components/app/parts-manager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const PARTS_STORAGE_KEY = 'press-shop-optimizer-parts';

export default function DataEntryPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedParts = window.localStorage.getItem(PARTS_STORAGE_KEY);
      setParts(savedParts ? JSON.parse(savedParts) : initialParts);
    } catch (error) {
      console.error("Failed to load parts from localStorage", error);
      setParts(initialParts);
    }
    setIsDataLoaded(true);
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      try {
        const updatedParts = parts.map((part, index) => ({...part, priority: index + 1}));
        window.localStorage.setItem(PARTS_STORAGE_KEY, JSON.stringify(updatedParts));
      } catch (error) {
        console.error("Failed to save parts to localStorage", error);
      }
    }
  }, [parts, isDataLoaded]);


  if (!isDataLoaded) {
      return (
        <div className="flex flex-col h-screen bg-background">
          <AppHeader />
           <main className="container mx-auto flex-1 p-4 md:p-6 lg:p-8">
                <Skeleton className="h-10 w-40 mb-8" />
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </main>
        </div>
      )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="container mx-auto">
              <div className="mb-8">
                  <Link href="/" passHref>
                      <Button variant="outline">
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to Dashboard
                      </Button>
                  </Link>
                  <h1 className="text-3xl font-bold font-headline mt-4">Part Data Management</h1>
                  <p className="text-muted-foreground">
                      Create, edit, and manage the master list of all production parts and their operations.
                  </p>
              </div>
              <PartsManager parts={parts} setParts={setParts} machines={initialMachines} />
          </div>
      </main>
    </div>
  );
}
