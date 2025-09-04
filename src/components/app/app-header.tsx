
import Link from 'next/link';
import { Factory } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  return (
    <header className="bg-card border-b sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
            <Factory className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-lg sm:text-2xl font-headline font-bold text-foreground">
              Press Shop Optimizer
            </h1>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="hidden sm:flex items-center space-x-1 sm:space-x-2">
              <Link href="/" passHref>
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Dashboard</Button>
              </Link>
               <Link href="/data-entry" passHref>
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Data Entry</Button>
              </Link>
              <Link href="/planner" passHref>
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Planner</Button>
              </Link>
               <Link href="/downtime-planner" passHref>
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Downtime</Button>
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
