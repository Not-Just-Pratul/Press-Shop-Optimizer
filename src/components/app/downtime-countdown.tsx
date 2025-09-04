
"use client";

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Hourglass } from 'lucide-react';

interface DowntimeTimerProps {
  startTimestamp: number;
}

export function DowntimeTimer({ startTimestamp }: DowntimeTimerProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      // Don't run the timer logic on the server or during the initial client render.
      return;
    }

    const calculateElapsed = () => {
      const now = Date.now();
      const diff = now - startTimestamp;

      if (diff < 0) {
        setElapsedTime('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
      const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    };

    // Start the interval only on the client.
    const interval = setInterval(calculateElapsed, 1000);
    calculateElapsed(); // Initial call to set the time immediately.

    // Cleanup the interval when the component unmounts.
    return () => clearInterval(interval);
  }, [startTimestamp, isClient]); // Rerun the effect if the startTimestamp or isClient changes.

  if (!isClient) {
    // Render a static placeholder on the server and during the initial client render.
    return (
        <Badge variant="destructive" className="flex items-center gap-1.5 w-fit">
            <Hourglass className="h-3 w-3" />
            <span>00:00:00</span>
        </Badge>
    );
  }

  // Render the dynamic timer only after the component has mounted on the client.
  return (
    <Badge variant="destructive" className="flex items-center gap-1.5 w-fit">
        <Hourglass className="h-3 w-3" />
        <span>{elapsedTime}</span>
    </Badge>
  );
}
