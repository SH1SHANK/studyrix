import Link from "next/link";
import { IconFileText, IconShieldLock, IconUserOff } from "@tabler/icons-react";
import { AppFrame } from "@/components/site/app-frame";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPage() {
  return (
    <AppFrame currentPath="/privacy">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Policy</Badge>
              <Badge variant="outline">Privacy & Disclaimer</Badge>
            </div>
            <CardTitle>Privacy and Data Handling</CardTitle>
            <CardDescription>Simple summary of how Studyrix handles local preferences and shared resources.</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <IconUserOff className="size-4" />
                No mandatory sign-up
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              You can browse course listings without creating a personal account in this interface.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <IconShieldLock className="size-4" />
                Local preference storage
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              View settings and offline metadata are stored in your browser environment for quick retrieval.
            </CardContent>
          </Card>
        </div>

        <Alert>
          <IconFileText />
          <AlertTitle>Content source note</AlertTitle>
          <AlertDescription>
            Study materials are community-shared. Always verify correctness before use in exams and assignments.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Privacy Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion defaultValue={["q1"]}>
              <AccordionItem value="q1">
                <AccordionTrigger>Where are my saved preferences stored?</AccordionTrigger>
                <AccordionContent>Preferences are retained locally in your browser on this device.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>Does Studyrix own the uploaded material?</AccordionTrigger>
                <AccordionContent>
                  No. Files are maintained by contributors and shared via connected source folders.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>How do I request takedown or correction?</AccordionTrigger>
                <AccordionContent>
                  Use the Launchpad channel and include course code, file name, and reason for correction.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Button variant="outline" size="sm" render={<Link href="/launchpad" />}>
          Open Launchpad Community
        </Button>

        <Separator />
      </div>
    </AppFrame>
  );
}
