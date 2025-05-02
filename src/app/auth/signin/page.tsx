"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, LogIn, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Invalid username or password");
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard on success
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError("An error occurred during sign in");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background/95 p-4 sm:p-8">
      <div className="flex flex-col items-center mb-8">
        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mb-4">
          A
        </div>
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
          AI Test Manager
        </h1>
      </div>
      
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 border-destructive/30 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-muted-foreground">
                  <User className="h-5 w-5" />
                </div>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-10 py-5"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 py-5"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full py-5 rounded-md mt-6 gap-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign in
                </>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 pb-6">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="#" className="text-primary hover:underline">
              Contact administrator
            </Link>
          </div>
          
          <div className="w-full flex items-center gap-2 before:content-[''] before:flex-1 before:border-t before:border-border after:content-[''] after:flex-1 after:border-t after:border-border">
            <span className="text-xs text-muted-foreground px-2">Secure login</span>
          </div>
          
          <div className="text-xs text-center text-muted-foreground/70">
            By signing in, you agree to our terms of service and privacy policy
          </div>
        </CardFooter>
      </Card>
      
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AI Test Manager. All rights reserved.
      </footer>
    </div>
  );
} 