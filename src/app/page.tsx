
"use client";

import { AppHeader } from "@/components/app/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, GanttChartSquare, ArrowRight, Wrench } from "lucide-react";
import Link from "next/link";


export default function Home() {

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        <div className="max-w-4xl w-full text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
                Welcome to the Press Shop Optimizer
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Your AI-powered assistant for creating efficient, data-driven production plans. Get started by managing your parts or creating a new plan for the day.
            </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <ListChecks className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">Data Entry</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <CardDescription className="mb-6">
                        Define and manage your master list of parts, including their multi-step production operations, timings, and machine requirements.
                    </CardDescription>
                     <Link href="/data-entry" passHref>
                        <Button className="w-full">
                            Manage Parts <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <GanttChartSquare className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">Daily Planner</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                     <CardDescription className="mb-6">
                        Select parts for today's run, set priorities, configure machine availability, and let the AI generate an optimized schedule for you.
                    </CardDescription>
                    <Link href="/planner" passHref>
                         <Button className="w-full">
                            Go to Planner <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Wrench className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="font-headline">Downtime Planner</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                     <CardDescription className="mb-6">
                        Adjust an active production plan in response to unexpected machine downtime or changes in priority.
                    </CardDescription>
                    <Link href="/downtime-planner" passHref>
                         <Button className="w-full">
                            Adjust Plan <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}

    
