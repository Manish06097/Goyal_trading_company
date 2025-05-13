"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from '@/components/Sidebar';
import { useState } from 'react'; // Import useState
import { usePathname } from 'next/navigation'; // Import usePathname
import { MenuIcon } from 'lucide-react'; // Import MenuIcon
import { Button } from "@/components/ui/button"; // Import Button

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Determine active link based on pathname
  const activeLink = pathname.split('/')[1] || 'dashboard'; // Assuming 'dashboard' is default or home

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased  h-screen`}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <Sidebar activeLink={activeLink} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

          {/* Main Content Area */}
          <div className={`flex-1 overflow-y-auto bg-gray-100 p-6 transition-all duration-200 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
            {/* Top Bar */}
            <div className="h-12 bg-white rounded-md shadow-sm mb-6 flex items-center px-4">
              {/* Hamburger Menu for Mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden!important mr-4 size-11" // Show only on mobile, add margin, ensure 44x44 tappable area
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle sidebar"
              >
                <MenuIcon className="size-6" /> {/* Hamburger icon */}
              </Button>
              {/* Breadcrumbs or User Menu */}
              {/* Add your breadcrumbs or user menu components here */}
            </div>

            {/* Page Content */}
            {children}
          </div>

        </div>
      </body>
    </html>
  );
}

