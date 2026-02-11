import { IconArrowUpRight, IconMessages, IconUsersGroup } from "@tabler/icons-react";
import { AppFrame } from "@/components/site/app-frame";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LAUNCHPAD_GROUPS } from "@/lib/revamp-data";

export default function LaunchpadPage() {
  return (
    <AppFrame currentPath="/launchpad">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Community</Badge>
              <Badge variant="outline">Launchpad</Badge>
            </div>
            <CardTitle>Launchpad Community Spaces</CardTitle>
            <CardDescription>Join active peer groups for resources, doubt-solving, and exam support.</CardDescription>
          </CardHeader>
        </Card>

        <Alert>
          <IconUsersGroup />
          <AlertTitle>Student-led moderation</AlertTitle>
          <AlertDescription>
            Group channels are curated by mentors and seniors to keep resource sharing organized.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {LAUNCHPAD_GROUPS.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <IconMessages className="size-4" />
                  {group.name}
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                Invite links open in WhatsApp. Keep discussions academic and useful for all batches.
              </CardContent>
              <CardFooter>
                <Button
                  variant="default"
                  size="sm"
                  render={<a href={group.href} target="_blank" rel="noopener noreferrer" />}
                >
                  Request Invite
                  <IconArrowUpRight />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Separator />
      </div>
    </AppFrame>
  );
}
