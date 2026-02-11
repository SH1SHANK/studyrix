"use client";

import Link from "next/link";
import { useEffect } from "react";
import { IconAlertTriangle, IconHome2, IconReload } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,oklch(0.95_0.03_277),transparent_40%)] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-2xl">
            <IconAlertTriangle className="size-7" />
            Unexpected Error
          </CardTitle>
          <CardDescription>An unexpected issue occurred while rendering this route.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              Try reloading the section. If the problem persists, return to the home page and retry.
            </AlertDescription>
          </Alert>
          {error.digest ? <p className="text-muted-foreground text-xs">Error digest: {error.digest}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <button className={buttonVariants({ variant: "outline", size: "sm" })} onClick={reset} type="button">
            <IconReload />
            Try Again
          </button>
          <Link href="/" className={buttonVariants({ size: "sm" })}>
            <IconHome2 />
            Go Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

