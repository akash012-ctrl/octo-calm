"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { signOut } from "@/lib/appwrite/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AuthLoading from "@/components/shared/AuthLoading";

export default function DashboardPage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return null; // Middleware will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.name}!</CardTitle>
            <CardDescription>
              You&apos;re successfully logged in to Octo-Calm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">User ID:</span> {user.$id}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Account created:</span>{" "}
              {new Date(user.$createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Continue building the Octo-Calm application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Set up Appwrite database and collections</li>
              <li>Create core types and interfaces</li>
              <li>Build mood tracking feature</li>
              <li>Implement AI chat interface</li>
              <li>Add intervention system</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
