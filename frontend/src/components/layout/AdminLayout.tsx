import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { BadgeDollarSign, Gavel, LayoutDashboard, LockKeyhole, LogOut, Menu, PackageCheck, PanelLeftClose, PanelLeftOpen, ReceiptText, ShieldCheck, Store, Users, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/vendors", label: "Vendors", icon: Store },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/orders", label: "Orders", icon: ReceiptText },
  { to: "/admin/finance", label: "Finance", icon: BadgeDollarSign },
  { to: "/admin/disputes", label: "Disputes", icon: Gavel },
  { to: "/admin/security", label: "Security", icon: LockKeyhole },
] as const;

export function AdminLayout() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { vendorSidebarOpen: open, setVendorSidebarOpen: setOpen, adminSidebarCollapsed: collapsed, setAdminSidebarCollapsed: setCollapsed } = useUIStore();
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => useAuthStore.persist.onFinishHydration(() => setHydrated(true)), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (user.role !== "admin") navigate({ to: "/marketplace", replace: true });
  }, [hydrated, navigate, user]);

  if (!hydrated || user?.role !== "admin") return <div className="min-h-screen bg-background" />;

  return <div className="h-screen overflow-hidden bg-background">
    <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card transition-[width] duration-300 lg:block", collapsed ? "w-20" : "w-60")}><AdminSidebar collapsed={collapsed} /></aside>
    <div className={cn("fixed inset-0 z-40 bg-foreground/40 transition-opacity lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setOpen(false)} />
    <aside className={cn("fixed inset-y-0 left-0 z-50 w-[82vw] max-w-xs bg-card shadow-xl transition-transform lg:hidden", open ? "translate-x-0" : "-translate-x-full")}><AdminSidebar close={() => setOpen(false)} /></aside>
    <div className={cn("h-screen overflow-hidden transition-[padding] duration-300", collapsed ? "lg:pl-20" : "lg:pl-60")}>
      <header className={cn("fixed left-0 right-0 top-0 z-20 flex h-16 items-center border-b border-border bg-card px-4 shadow-sm transition-[left] duration-300 sm:px-6", collapsed ? "lg:left-20" : "lg:left-60")}>
        <button className="mr-3 flex h-9 w-9 items-center justify-center rounded-md border border-border lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <Link to="/admin" className="mr-3 flex items-center gap-2 lg:hidden"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><ShieldCheck className="h-4 w-4" /></span><span className="font-display font-bold">Vendura</span></Link>
        <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)} className="mr-3 hidden h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground lg:flex">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
        <div><p className="text-sm font-semibold">Platform administration</p><p className="text-xs text-muted-foreground">Live marketplace operations</p></div>
        <div className="ml-auto flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{(user?.fullName ?? "Admin").split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div className="hidden sm:block"><p className="text-sm font-medium">{user?.fullName ?? "Administrator"}</p><p className="text-xs text-muted-foreground">Super admin</p></div></div>
      </header>
      <div className="h-16" aria-hidden="true" />
      <main className="h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}

function AdminSidebar({ close, collapsed = false }: { close?: () => void; collapsed?: boolean }) {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const clear = useAuthStore((state) => state.clear);
  return <div className="flex h-full flex-col">
    <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center px-2" : "gap-3 px-4")}><span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></span>{collapsed ? <span className="text-[10px] font-bold">Admin</span> : <div><p className="font-display font-bold">Vendura</p><p className="text-xs text-muted-foreground">Admin Console</p></div>}{close && <button className="ml-auto" onClick={close} aria-label="Close menu"><X className="h-5 w-5" /></button>}</div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">{nav.map((item) => { const active = "end" in item ? location.pathname === item.to : location.pathname.startsWith(item.to); const Icon = item.icon; return <Link key={item.to} to={item.to} onClick={close} title={collapsed ? item.label : undefined} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium", collapsed && "justify-center gap-0 px-0", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className="h-4 w-4" />{!collapsed && item.label}</Link>; })}</nav>
    <div className="border-t border-border p-3"><Link to="/marketplace" title={collapsed ? "View marketplace" : undefined} className={cn("mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent", collapsed && "justify-center gap-0 px-0")}><PackageCheck className="h-4 w-4" />{!collapsed && "View marketplace"}</Link><button title={collapsed ? "Log out" : undefined} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10", collapsed && "justify-center gap-0 px-0")} onClick={() => { clear(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" />{!collapsed && "Log out"}</button></div>
  </div>;
}
