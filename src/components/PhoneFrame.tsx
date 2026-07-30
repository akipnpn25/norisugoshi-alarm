"use client";

import { Headphones } from "lucide-react";

interface PhoneFrameProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  earphoneConnected?: boolean;
  earphoneChecked?: boolean;
  theme?: "night" | "day";
}

export function PhoneFrame({
  children,
  footer,
  earphoneConnected = false,
  earphoneChecked = false,
  theme = "night",
}: PhoneFrameProps) {
  return (
    <div className="lg:flex lg:min-h-screen lg:items-center lg:justify-center lg:bg-gradient-to-b lg:from-slate-300 lg:to-slate-500 lg:p-6">
      <div className="lg:relative lg:w-[410px] lg:h-[min(860px,88vh)] lg:rounded-[3.5rem] lg:p-[3px] lg:bg-gradient-to-b lg:from-gray-800 lg:to-gray-900 lg:border lg:border-gray-600/40 lg:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.45)]">
        <div
          className={`relative flex h-screen flex-col overflow-hidden lg:h-full lg:rounded-[3.3rem] phone-frame-screen ${
            theme === "day" ? "theme-day" : ""
          }`}
        >
          {/* Dynamic Island - desktop only */}
          <div className="hidden lg:block absolute top-2.5 left-1/2 -translate-x-1/2 z-50 h-[30px] w-[110px] rounded-full bg-black" />

          {/* 背景レイヤー: 夜 — グラデーション空 */}
          <div className="pointer-events-none absolute inset-0 z-0 sky-night" />

          {/* 背景レイヤー: 昼 — グラデーション空 */}
          <div className="pointer-events-none absolute inset-0 z-0 sky-day" />

          {/* 星空 (夜のみ) — twinkle */}
          <div
            className="pointer-events-none absolute inset-0 z-0 starfield"
            style={{ animation: "twinkle 4s ease-in-out infinite" }}
          />

          {/* 月の光ハロー (夜のみ) */}
          <div className="pointer-events-none absolute -top-16 right-4 z-0 h-48 w-48 rounded-full moon-glow" />

          {/* 三日月 (夜のみ) */}
          <div className="pointer-events-none absolute top-6 right-8 z-0 crescent-moon" />

          {/* 夜霧 (夜のみ) */}
          <div className="pointer-events-none absolute inset-0 z-0 night-mist" />

          {/* 太陽の光ハロー (昼のみ) */}
          <div className="pointer-events-none absolute -top-20 -left-12 z-0 h-52 w-52 rounded-full sun-glow" />

          {/* 柔らかい雲 (昼のみ) */}
          <div
            className="pointer-events-none absolute inset-0 z-0 cloud-field"
            style={{ animation: "cloud-drift 45s linear infinite" }}
          />

          {/* ステータスバー: イヤホン状態 */}
          <div className="z-40 flex shrink-0 items-center justify-end px-4 pt-3.5 pb-2 bg-night/60 backdrop-blur-md">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-bold backdrop-blur-sm transition-colors ${
                !earphoneChecked
                  ? "bg-white/5 text-muted-foreground"
                  : earphoneConnected
                    ? "bg-success/15 text-success"
                    : "bg-destructive/12 text-destructive"
              }`}
            >
              <Headphones size={18} />
              {!earphoneChecked
                ? "未確認"
                : earphoneConnected
                  ? "接続中"
                  : "未接続"}
            </div>
          </div>

          {/* App content (scrollable, fills remaining space) */}
          <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
            {children}
          </div>

          {/* Tab bar footer (固定、スクロールしない) */}
          {footer}
        </div>
      </div>
    </div>
  );
}
