"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Sidebar from "./sidebar";
import Header from "./header";
import { useTheme } from "next-themes";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme } = useTheme();

  // Handle responsive layout
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Set initial state
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Clean up
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Check if it's a public route (login, error, etc.)
  const isPublicRoute = pathname?.startsWith("/auth/");

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        toggleSidebar={toggleSidebar} 
        isSidebarOpen={isSidebarOpen} 
        user={session?.user}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          isMobile={isMobile} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        <main 
          className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'lg:ml-64' : ''}`}
        >
          <div className="container mx-auto py-6 px-3 md:px-4 lg:px-6 max-w-[95%]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 