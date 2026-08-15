import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, ChevronRight, Gauge, KeyRound, LayoutDashboard, LogOut, PanelLeft, Radio, Send, Settings2, ShieldCheck, Stethoscope } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: Settings2, label: "Configuration", path: "/configuration" },
  { icon: ShieldCheck, label: "Security", path: "/security" },
  { icon: Activity, label: "Monitor", path: "/monitor" },
  { icon: Send, label: "Test", path: "/test" },
  { icon: Stethoscope, label: "Troubleshoot", path: "/troubleshoot" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY) || 276));
  const { loading, user } = useAuth();
  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)), [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="min-h-screen grid place-items-center bg-background p-6"><div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl"><div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><Radio className="h-6 w-6" /></div><h1 className="text-2xl font-semibold tracking-tight">Hermes Agent</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Owner authentication is required to access the gateway control plane.</p><Button className="mt-6 w-full" onClick={() => startLogin()}>Sign in as owner</Button></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const active = menuItems.find(item => item.path === location) ?? menuItems[0];

  useEffect(() => {
    const move = (event: MouseEvent) => { if (isResizing) setSidebarWidth(Math.min(440, Math.max(210, event.clientX - (sidebarRef.current?.getBoundingClientRect().left ?? 0)))); };
    const up = () => setIsResizing(false);
    if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; }
    return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; };
  }, [isResizing, setSidebarWidth]);

  return <><div ref={sidebarRef} className="relative"><Sidebar collapsible="icon" className="border-r border-sidebar-border" disableTransition={isResizing}><SidebarHeader className="h-20 justify-center border-b border-sidebar-border"><div className="flex w-full items-center gap-3 px-2"><button onClick={toggleSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed && <div className="min-w-0"><div className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary"><Radio className="h-4 w-4" /></div><span className="truncate font-semibold tracking-tight">Hermes Agent</span></div><p className="mt-1 pl-9 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Gateway control plane</p></div>}</div></SidebarHeader><SidebarContent><SidebarMenu className="gap-1 px-2 py-4">{menuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 font-normal"><item.icon className="h-4 w-4" /><span>{item.label}</span>{!isCollapsed && location === item.path && <ChevronRight className="ml-auto h-3.5 w-3.5" />}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-sidebar-border p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-sidebar-accent"><Avatar className="h-9 w-9 border border-sidebar-border"><AvatarFallback className="bg-primary/15 text-xs text-primary">{user?.name?.charAt(0).toUpperCase() || "O"}</AvatarFallback></Avatar>{!isCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user?.name || "Owner"}</p><p className="mt-1 truncate text-xs text-muted-foreground">Owner access</p></div>}</button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} /></div><SidebarInset>{isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur"><SidebarTrigger className="h-9 w-9" /><div><p className="text-sm font-semibold">{active.label}</p><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Hermes Agent</p></div></div>}<main className="min-h-screen flex-1">{children}</main></SidebarInset></>;
}
