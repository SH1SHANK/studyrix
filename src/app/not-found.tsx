import Link from "next/link";
import { IconError404, IconHome2 } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,oklch(0.95_0.03_277),transparent_40%)] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-2xl">
            <IconError404 className="size-7" />
            Page Not Found
          </CardTitle>
          <CardDescription>The route you requested does not exist in the current site map.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <IconError404 />
            <AlertTitle>404</AlertTitle>
            <AlertDescription>
              Return to the homepage or continue browsing the resource library from the navigation.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button size="sm" render={<Link href="/" />}>
            <IconHome2 />
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
