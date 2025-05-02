import Link from 'next/link';
import { ArrowRight, Layers, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 lg:p-16">
        <div className="max-w-4xl w-full mx-auto text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-6">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
              AI-Powered Testing Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
                AI Test Manager
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your test workflow with our AI-powered platform for managing manual and automated test cases with Playwright integration
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button asChild size="lg" className="rounded-full gap-2 px-6">
                <Link href="/dashboard">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full gap-2 px-6">
                <Link href="/docs">
                  Documentation
                </Link>
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-12">
            <Link href="/projects" className="block">
              <div className="bg-card rounded-xl p-6 text-left shadow-sm border border-border hover:shadow-md hover:border-primary/40 transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Project Management</h3>
                <p className="text-muted-foreground">Organize your test cases into projects for better management and collaboration.</p>
              </div>
            </Link>
            <Link href="/tests/automation" className="block">
              <div className="bg-card rounded-xl p-6 text-left shadow-sm border border-border hover:shadow-md hover:border-primary/40 transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <PlayCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Test Automation</h3>
                <p className="text-muted-foreground">Integration with Playwright for automated test execution and reporting.</p>
              </div>
            </Link>
            <Link href="/ai-generation" className="block">
              <div className="bg-card rounded-xl p-6 text-left shadow-sm border border-border hover:shadow-md hover:border-primary/40 transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                    <path d="M12 2a5 5 0 0 0-5 5c0 1.7.75 4.25 5 9.25 4.25-5 5-7.55 5-9.25a5 5 0 0 0-5-5Z" />
                    <circle cx="12" cy="7" r="1" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium mb-2">AI Test Generation</h3>
                <p className="text-muted-foreground">Leverage AI to generate test cases and scenarios based on your application requirements.</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
      <footer className="py-6 px-4 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Test Manager. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/about" className="hover:text-primary transition-colors">About</Link>
            <Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
} 