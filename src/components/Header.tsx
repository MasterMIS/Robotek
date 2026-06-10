"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { navigation } from "@/lib/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import {
  BellIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

import ThemeToggle from "./ThemeToggle";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { permissions: userPermissions, isAdmin } = usePermissions();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredNavigation = navigation.filter(item => {
    if (item.id === 'dashboard' || item.id === 'chat' || item.id === 'scheduler' || item.id === 'grn' || item.id === 'field-driver' || item.id === 'stationary') return true;
    if (userPermissions.length > 0) {
      return userPermissions.some((p: string) => p.toLowerCase() === item.id.toLowerCase());
    }
    return isAdmin;
  });

  const searchResults = filteredNavigation.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNormalizedImageUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
      const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/thumbnail?sz=w200&id=${match[1]}`;
      }
    }
    return url;
  };

  const { data: chatData } = useSWR<any[]>('/api/chat/users', fetcher, {
    refreshInterval: 120000,
  });
  const chatUnreadCount = Array.isArray(chatData) ? chatData.reduce((acc, user) => acc + (user.unreadCount || 0), 0) : 0;

  return (
    <header
      style={{
        backgroundColor: '#003875',
        borderBottom: 'none'
      }}
      className="h-14 flex items-center justify-between px-2 md:px-6 sticky top-0 z-30 transition-all duration-300"
    >
      {/* Left Section: Mobile Menu & Welcome Message */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 md:hidden text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        <div className="flex flex-col hidden md:flex">
          <h1 className="text-2xl font-bold text-white leading-none">
            HI, {(session?.user as any)?.username?.toUpperCase() || session?.user?.name?.toUpperCase() || session?.user?.email?.split("@")[0].toUpperCase() || "USER"}
          </h1>
          <p className="font-serif text-[10px] font-medium text-[#FFD500] uppercase tracking-wider mt-1 opacity-80">
            {/* @ts-ignore */}
            {session?.user?.role || "SYSTEM ACCESS"} — WELCOME BACK
          </p>
        </div>
      </div>

      <div className="flex-1 min-w-0" />

      {/* Right Section: Search, Notifications & Profile */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {/* Search Input - Hidden on mobile */}
        <div ref={searchRef} className="relative group hidden lg:block flex-shrink-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-32 lg:w-52 pl-11 pr-4 py-1.5 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/50 focus:bg-white/20 transition-all text-xs font-bold placeholder:text-white/40 text-white"
          />
          
          {/* Search Dropdown */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full lg:w-64 -right-10 lg:right-0 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-gray-100 dark:border-navy-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
              <div className="p-1.5">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.name}-${idx}`}
                    onClick={() => {
                      router.push(item.href);
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3 group/item"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-navy-900 group-hover/item:bg-[#003875]/10 dark:group-hover/item:bg-[#FFD500]/10 transition-colors">
                      <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover/item:text-[#003875] dark:group-hover/item:text-[#FFD500]" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                      <div className="text-[10px] text-gray-500 font-medium tracking-wider uppercase">{item.section}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle (Replaces Bell) */}
        <ThemeToggle />

        {/* Chat Notification Icon */}
        <Link
          href="/chat"
          className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 dark:hover:bg-navy-800 rounded-lg transition-colors ml-0.5 md:ml-1"
          title="Chat Messages"
        >
          <ChatBubbleLeftRightIcon className="w-5 h-5" />
          {chatUnreadCount > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1 py-0.5 text-[9px] font-black leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-[#CE2029] rounded-full shadow-sm ring-2 ring-[#003875]">
              {chatUnreadCount}
            </span>
          )}
        </Link>

        <div className="h-5 w-[1px] bg-gray-200/50 dark:bg-navy-800 mx-1 md:mx-2" />

        {/* User Profile & Logout */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-7 h-7 md:w-8.5 md:h-8.5 rounded-xl overflow-hidden shadow-sm border border-orange-100 ring-2 ring-[#FFD500]/20 flex-shrink-0">
            {session?.user?.image ? (
              <img
                src={getNormalizedImageUrl(session.user.image)}
                alt="Profile"
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-[#FFD500] flex items-center justify-center text-[#CE2029] font-black text-[10px] md:text-xs uppercase">
                {session?.user?.name?.substring(0, 2) || session?.user?.email?.substring(0, 2) || "UR"}
              </div>
            )}
          </div>

          <button
            suppressHydrationWarning
            onClick={() => signOut()}
            className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg md:rounded-xl transition-all group"
            title="Sign Out"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 md:w-5.5 md:h-5.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
