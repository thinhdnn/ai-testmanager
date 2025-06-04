"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { 
  BookOpen, 
  Home, 
  Settings, 
  Users, 
  FileText, 
  Play, 
  X, 
  Layers, 
  Database,
  LayoutDashboard,
  Folder,
  ClipboardCheck,
  PlayCircle,
  BarChart3
} from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
};

export default function Sidebar({ isOpen, isMobile, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: "Projects",
      href: "/projects",
      icon: <Folder className="h-5 w-5" />
    },
    {
      name: "Users",
      href: "/users",
      icon: <Users className="h-5 w-5" />,
      permission: "user.manage"
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
      permission: "system.settings"
    }
  ];

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: "-100%" }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {(isOpen || !isMobile) && (
          <motion.aside
            className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r shadow-lg flex flex-col transition-transform lg:translate-x-0 lg:z-0 
            ${isMobile ? 'top-0 h-full' : 'top-16 h-[calc(100vh-4rem)]'}`}
            initial={isMobile ? "closed" : "open"}
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {isMobile && (
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <div className="px-3 py-4 overflow-y-auto">
              <ul className="space-y-1.5">
                {navItems.map((item) => (
                  <PermissionGuard 
                    key={item.href}
                    permission={item.permission}
                  >
                    <li>
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md group transition-all duration-200
                          ${
                            pathname === item.href || pathname?.startsWith(`${item.href}/`)
                              ? "bg-primary text-primary-foreground shadow-sm" 
                              : "text-foreground hover:bg-muted"
                          }`}
                      >
                        <span className={`mr-3 transition-transform duration-200 ${
                          pathname === item.href || pathname?.startsWith(`${item.href}/`) 
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}>
                          {item.icon}
                        </span>
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  </PermissionGuard>
                ))}
              </ul>
            </div>

            <div className="mt-auto p-4 border-t bg-muted/30">
              <div className="text-xs text-center space-y-1">
                <p className="font-medium text-foreground">AI Test Manager</p>
                <p className="text-muted-foreground">v1.0</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
} 