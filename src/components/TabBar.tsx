"use client";

import { Home, Bell, Activity, History, Settings } from "lucide-react";
import type { Tab } from "@/src/lib/types";

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  hasActiveAlarm: boolean;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "ホーム", icon: <Home size={20} /> },
  { id: "alarm", label: "アラーム", icon: <Bell size={20} /> },
  { id: "active", label: "実行中", icon: <Activity size={20} /> },
  { id: "history", label: "履歴", icon: <History size={20} /> },
  { id: "settings", label: "設定", icon: <Settings size={20} /> },
];

export function TabBar({ active, onChange, hasActiveAlarm }: TabBarProps) {
  return (
    <nav
      className="z-40 shrink-0 border-t border-border bg-night-deep/95 px-1 pt-1 backdrop-blur-md"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const isDisabled = tab.id === "active" && !hasActiveAlarm;
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onChange(tab.id)}
              disabled={isDisabled}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors ${
                isActive
                  ? "text-moon"
                  : isDisabled
                    ? "text-muted-foreground/30"
                    : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <span
                  className={`transition-transform ${
                    isActive ? "scale-110" : "scale-100"
                  }`}
                >
                  {tab.icon}
                </span>
                {tab.id === "active" && hasActiveAlarm && (
                  <span className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-moon" />
                )}
              </span>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
