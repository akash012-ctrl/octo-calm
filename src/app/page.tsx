import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Heart,
  MessageCircle,
  Brain,
  Shield,
  Moon,
} from "lucide-react";

export default function Home() {
  return (
    <div className="app-shell">
      {/* Navigation */}
      <nav className="octo-nav sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="brand-avatar w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl">
                🐙
              </div>
              <span className="text-xl font-semibold">Octo-Calm</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-muted-foreground">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="rounded-full shadow-octo-elevated">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Animated Octopus Avatar */}
          <div className="flex justify-center mb-8">
            <div className="brand-gradient w-32 h-32 rounded-full flex items-center justify-center text-7xl animate-pulse shadow-primary-glow">
              🐙
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Your mental health companion,
            <span className="block text-brand-primary mt-2">
              one tentacle at a time
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Evidence-based interventions, realtime voice support, and a kind AI
            companion to help you navigate tough moments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg shadow-octo-elevated transition-all"
              >
                Start your journey
              </Button>
            </Link>
            <Link href="#features">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 py-6 text-lg border-primary text-brand-primary hover:bg-primary/10"
              >
                Learn more
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground pt-4">
            Free to start • No credit card required • Your privacy matters
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tools that actually help
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Science-backed interventions designed for real moments, not
              perfect ones.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Mood Check-ins */}
            <Card className="octo-card shadow-primary-glow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[color:var(--octo-primary)]/10">
                  <Activity className="w-6 h-6 text-brand-primary" />
                </div>
                <CardTitle>Daily check-ins</CardTitle>
                <CardDescription>
                  Quick mood tracking with voice or text. See patterns,
                  understand yourself better.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Realtime Voice */}
            <Card className="octo-card shadow-primary-glow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[color:var(--octo-secondary)]/10">
                  <MessageCircle className="w-6 h-6 text-brand-secondary" />
                </div>
                <CardTitle>Voice companion</CardTitle>
                <CardDescription>
                  Talk it out anytime. AI-powered conversations that listen and
                  guide you through tough moments.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Smart Interventions */}
            <Card className="octo-card shadow-primary-glow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[color:var(--octo-success)]/10">
                  <Brain className="w-6 h-6 text-[color:var(--octo-success)]" />
                </div>
                <CardTitle>Smart interventions</CardTitle>
                <CardDescription>
                  CBT, DBT, grounding exercises. The right tool at the right
                  moment, personalized for you.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Crisis Support */}
            <Card className="octo-card shadow-primary-glow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[color:var(--octo-error)]/10">
                  <Shield className="w-6 h-6 text-[color:var(--octo-error)]" />
                </div>
                <CardTitle>Crisis safety net</CardTitle>
                <CardDescription>
                  Immediate resources when you need them most. We&apos;ve got
                  your back, always.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Peer Support */}
            <Card className="octo-card shadow-primary-glow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[color:var(--octo-info)]/10">
                  <Heart className="w-6 h-6 text-[color:var(--octo-info)]" />
                </div>
                <CardTitle>Peer community</CardTitle>
                <CardDescription>
                  Anonymous, moderated space to share and connect with others
                  who get it.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Sleep & Routines */}
            <Card className="octo-card shadow-primary-glow">
              <CardHeader>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[color:var(--octo-warning)]/10">
                  <Moon className="w-6 h-6 text-[color:var(--octo-warning)]" />
                </div>
                <CardTitle>Sleep & routines</CardTitle>
                <CardDescription>
                  Wind-down rituals, sleep hygiene tracking, and gentle
                  reminders for self-care.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="brand-gradient border-none shadow-primary-glow rounded-3xl overflow-hidden">
            <CardContent className="p-12 text-center text-white">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to feel a little lighter?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands finding their calm, one tentacle at a time.
              </p>
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-white text-brand-primary hover:bg-white/90 rounded-full px-8 py-6 text-lg font-semibold shadow-octo-elevated"
                >
                  Start free today
                </Button>
              </Link>
              <p className="text-sm text-white/80 mt-6">
                No commitment • Cancel anytime • Your data stays yours
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="brand-avatar w-8 h-8 rounded-full flex items-center justify-center text-white">
                🐙
              </div>
              <span className="font-semibold">Octo-Calm</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2025 Octo-Calm. Mental health support, reimagined.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="link-brand transition-colors">
                Privacy
              </a>
              <a href="#" className="link-brand transition-colors">
                Terms
              </a>
              <a href="#" className="link-brand transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
