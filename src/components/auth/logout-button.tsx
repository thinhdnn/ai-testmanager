"use client";

import { signOut } from "next-auth/react";
import { Button, ButtonProps } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LogoutButtonProps extends ButtonProps {
  showIcon?: boolean;
}

export default function LogoutButton({ 
  showIcon = true,
  children,
  ...props 
}: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <Button 
      onClick={handleLogout} 
      variant="ghost" 
      {...props}
    >
      {showIcon && <LogOut className="mr-2 h-4 w-4" />}
      {children || "Logout"}
    </Button>
  );
} 