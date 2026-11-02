import type { AppLink } from "@/components/AppHeader";

export function appNav(active: "dashboard" | "schedules" | "history" | "settings"): AppLink[] {
  return [
    { label: "Dashboard", href: "/dashboard", active: active === "dashboard" },
    { label: "Schedules", href: "/schedules", active: active === "schedules" },
    { label: "History", href: "/history", active: active === "history" },
    { label: "Settings", href: "/settings", active: active === "settings" },
  ];
}
