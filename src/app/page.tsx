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
    <div className="min-h-screen bg-gradient-to-b from-[#f7f9fb] to-white dark:from-[#0f1419] dark:to-[#1a1f26]">
      {/* Navigation */}
      <nav className="border-b border-[#e1e8ed] dark:border-[#2c3440] bg-white/80 dark:bg-[#1a1f26]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#4a9b9d] to-[#6bb5b7] rounded-full flex items-center justify-center text-white font-bold text-xl">
                🐙
              </div>
              <span className="text-xl font-semibold text-[#2c3e50] dark:text-[#e1e8ed]">
                Octo-Calm
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-[#607d8b] dark:text-[#90a4ae]"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-[#4a9b9d] hover:bg-[#367173] text-white rounded-full">
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
            <div className="w-32 h-32 bg-gradient-to-br from-[#4a9b9d] to-[#6bb5b7] rounded-full flex items-center justify-center text-7xl animate-pulse shadow-xl">
              🐙
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2c3e50] dark:text-[#e1e8ed] tracking-tight">
            Your mental health companion,
            <span className="block text-[#4a9b9d] mt-2">
              one tentacle at a time
            </span>
          </h1>

          <p className="text-xl text-[#607d8b] dark:text-[#90a4ae] max-w-2xl mx-auto leading-relaxed">
            Evidence-based interventions, realtime voice support, and a kind AI
            companion to help you navigate tough moments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-[#4a9b9d] hover:bg-[#367173] text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Start your journey
              </Button>
            </Link>
            <Link href="#features">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 py-6 text-lg border-[#4a9b9d] text-[#4a9b9d] hover:bg-[#4a9b9d]/10"
              >
                Learn more
              </Button>
            </Link>
          </div>

          <p className="text-sm text-[#90a4ae] dark:text-[#607d8b] pt-4">
            Free to start • No credit card required • Your privacy matters
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-white/50 dark:bg-[#1a1f26]/50"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2c3e50] dark:text-[#e1e8ed] mb-4">
              Tools that actually help
            </h2>
            <p className="text-lg text-[#607d8b] dark:text-[#90a4ae] max-w-2xl mx-auto">
              Science-backed interventions designed for real moments, not
              perfect ones.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Mood Check-ins */}
            <Card className="hover:shadow-lg transition-shadow border-[#e1e8ed] dark:border-[#2c3440] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-[#4a9b9d]/10 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-[#4a9b9d]" />
                </div>
                <CardTitle className="text-[#2c3e50] dark:text-[#e1e8ed]">
                  Daily check-ins
                </CardTitle>
                <CardDescription className="text-[#607d8b] dark:text-[#90a4ae]">
                  Quick mood tracking with voice or text. See patterns,
                  understand yourself better.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Realtime Voice */}
            <Card className="hover:shadow-lg transition-shadow border-[#e1e8ed] dark:border-[#2c3440] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-[#e78b8b]/10 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-[#e78b8b]" />
                </div>
                <CardTitle className="text-[#2c3e50] dark:text-[#e1e8ed]">
                  Voice companion
                </CardTitle>
                <CardDescription className="text-[#607d8b] dark:text-[#90a4ae]">
                  Talk it out anytime. AI-powered conversations that listen and
                  guide you through tough moments.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Smart Interventions */}
            <Card className="hover:shadow-lg transition-shadow border-[#e1e8ed] dark:border-[#2c3440] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-[#81c784]/10 rounded-full flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-[#81c784]" />
                </div>
                <CardTitle className="text-[#2c3e50] dark:text-[#e1e8ed]">
                  Smart interventions
                </CardTitle>
                <CardDescription className="text-[#607d8b] dark:text-[#90a4ae]">
                  CBT, DBT, grounding exercises. The right tool at the right
                  moment, personalized for you.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Crisis Support */}
            <Card className="hover:shadow-lg transition-shadow border-[#e1e8ed] dark:border-[#2c3440] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-[#e57373]/10 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-[#e57373]" />
                </div>
                <CardTitle className="text-[#2c3e50] dark:text-[#e1e8ed]">
                  Crisis safety net
                </CardTitle>
                <CardDescription className="text-[#607d8b] dark:text-[#90a4ae]">
                  Immediate resources when you need them most. We&apos;ve got
                  your back, always.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Peer Support */}
            <Card className="hover:shadow-lg transition-shadow border-[#e1e8ed] dark:border-[#2c3440] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-[#64b5f6]/10 rounded-full flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-[#64b5f6]" />
                </div>
                <CardTitle className="text-[#2c3e50] dark:text-[#e1e8ed]">
                  Peer community
                </CardTitle>
                <CardDescription className="text-[#607d8b] dark:text-[#90a4ae]">
                  Anonymous, moderated space to share and connect with others
                  who get it.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Sleep & Routines */}
            <Card className="hover:shadow-lg transition-shadow border-[#e1e8ed] dark:border-[#2c3440] rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-[#ffb74d]/10 rounded-full flex items-center justify-center mb-4">
                  <Moon className="w-6 h-6 text-[#ffb74d]" />
                </div>
                <CardTitle className="text-[#2c3e50] dark:text-[#e1e8ed]">
                  Sleep & routines
                </CardTitle>
                <CardDescription className="text-[#607d8b] dark:text-[#90a4ae]">
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
          <Card className="bg-gradient-to-br from-[#4a9b9d] to-[#6bb5b7] border-none shadow-2xl rounded-3xl overflow-hidden">
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
                  className="bg-white text-[#4a9b9d] hover:bg-white/90 rounded-full px-8 py-6 text-lg font-semibold shadow-lg"
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
      <footer className="border-t border-[#e1e8ed] dark:border-[#2c3440] py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#4a9b9d] to-[#6bb5b7] rounded-full flex items-center justify-center text-white">
                🐙
              </div>
              <span className="text-[#2c3e50] dark:text-[#e1e8ed] font-semibold">
                Octo-Calm
              </span>
            </div>
            <p className="text-sm text-[#90a4ae] dark:text-[#607d8b] text-center">
              © 2025 Octo-Calm. Mental health support, reimagined.
            </p>
            <div className="flex gap-6 text-sm text-[#607d8b] dark:text-[#90a4ae]">
              <a href="#" className="hover:text-[#4a9b9d] transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-[#4a9b9d] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[#4a9b9d] transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
