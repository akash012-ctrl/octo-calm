"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InterventionsWorkspacePage() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard/companion");
  }, [router]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border bg-card/90 px-6 py-12 text-center shadow-primary-glow">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="space-y-3">
          <CardTitle className="text-3xl font-semibold tracking-tight">
            Guided exercises are paused
          </CardTitle>
          <CardDescription className="text-balance text-sm text-muted-foreground">
            We retired standalone interventions while we focus on building the
            best possible realtime voice companion. All grounding, breathing,
            and safety support now happens inside the live session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            Need structure between calls? Ask the companion for an action plan
            or recap to keep things moving. Every summary captures suggested
            follow-ups and safety notes.
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/dashboard/companion">
                <Headphones className="mr-2 h-4 w-4" /> Launch voice companion
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">
                <ArrowRight className="mr-2 h-4 w-4" /> Back to dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
