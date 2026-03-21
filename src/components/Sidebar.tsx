"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";

import { useSession, signOut } from "next-auth/react";
import { XMarkIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from "@heroicons/react/24/outline";

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // @ts-ignore
  const userPermissions = session?.user?.permissions || [];
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const filteredNavigation = navigation.filter(item => {
    // Dashboard is the system home, visible to all authenticated users
    if (item.id === 'dashboard') return true;

    // If matrix permissions exist, use them strictly
    if (userPermissions.length > 0) {
      return userPermissions.includes(item.id);
    }
    // Fallback: Default to allowing Admins if no matrix data exists yet
    return isAdmin;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-all duration-300"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      <aside 
        style={{ background: mobileOpen ? 'var(--background)' : undefined }}
        className={`
        fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out
        ${mobileOpen 
          ? 'w-60 translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)] border-r-4 border-[#FFD500] dark:border-[#FFD500]/50 rounded-r-[2.5rem]' 
          : 'w-16 -translate-x-full md:translate-x-0 md:bg-transparent md:dark:bg-transparent md:hover:w-56'}
        flex flex-col group overflow-hidden peer
      `}>

        <div className="flex items-center justify-between p-5 md:p-0 md:pt-6 md:pb-2 md:pl-5">
          <Link href="/" className="flex items-center gap-4 group/logo active:scale-95 transition-transform">
            <div className="w-10 h-10 min-w-[40px] rounded-xl overflow-hidden shadow-lg transform group-hover/logo:-rotate-6 transition-transform duration-500 ring-1 ring-black/5 dark:ring-white/10">
              <img src="/logo_compact.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className={`text-xl font-black tracking-tight text-gray-900 dark:text-white transition-all duration-300 whitespace-nowrap ${mobileOpen ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
              Robotek
            </span>
          </Link>

          {mobileOpen && (
            <button 
              onClick={() => setMobileOpen?.(false)}
              className="p-2 text-[#003875] bg-[#FFD500] hover:bg-[#FFE55C] rounded-xl md:hidden transition-all shadow-md active:scale-90"
            >
              <XMarkIcon className="w-6 h-6 stroke-[3]" />
            </button>
          )}
        </div>
        
        <nav className="flex-1 px-4 md:px-2 pt-4 md:pt-1 pb-4 space-y-2 overflow-y-auto overflow-x-hidden invisible-scrollbar">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen?.(false)}
                className={`
                  flex items-center gap-4 px-4 md:px-3 py-3 rounded-2xl transition-all group/item font-bold overflow-hidden
                  ${isActive 
                    ? 'bg-[#003875] text-white shadow-lg shadow-[#003875]/20 md:translate-x-1' 
                    : 'text-gray-600 dark:text-slate-400 hover:text-[#003875] dark:hover:text-[#FFD500] hover:bg-white/40 dark:hover:bg-white/5 active:scale-95 hover:translate-x-1'}
                `}
              >
                <div className="flex items-center justify-center w-6 min-w-[24px]">
                  <item.icon className={`w-6 h-6 transition-all font-bold ${isActive ? 'text-white' : 'group-hover/item:text-[#003875] dark:group-hover/item:text-[#FFD500] group-hover/item:scale-110'}`} />
                </div>
                <span className={`text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 md:group-hover:opacity-100 md:group-hover:translate-x-0'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile User Profile Section */}
        {mobileOpen && (
          <div className="p-4 mt-auto border-t border-[#003875]/5 dark:border-white/5 md:hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/50 dark:bg-white/5 p-4 rounded-3xl flex items-center gap-3 border border-[#003875]/10 dark:border-white/5 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-[#f2b60c]/10 dark:bg-[#FFD500]/10 flex items-center justify-center border border-[#f2b60c]/20 dark:border-[#FFD500]/20">
                <UserCircleIcon className="w-6 h-6 text-[#003875] dark:text-[#FFD500]" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                  {(session?.user as any)?.username?.toUpperCase() || "USER"}
                </p>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 capitalize">
                  {/* @ts-ignore */}
                  {session?.user?.role || "Member"}
                </p>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-gray-400 hover:text-[#CE2029] hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
