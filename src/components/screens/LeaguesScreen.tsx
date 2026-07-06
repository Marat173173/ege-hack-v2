"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Crown, ChevronUp, Info, Flame, Sparkles, Zap, Building2, Target, type LucideIcon } from "lucide-react";
import { useApp } from "@/lib/store";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ACHIEVEMENTS, tierOf, type AchievementCtx, type Achievement } from "@/lib/achievements";
import { floorState } from "@/lib/floor-state";
import { overallReadiness } from "@/lib/floor-build";
import { LIVE_KEYS } from "@/data/catalog";

const ICONS: Record<string, LucideIcon> = {
  Flame, Sparkles, Zap, Building2, Target,
};

/** Демо-соперники лиги — правдоподобные имена и XP вокруг твоего значения. */
function demoRivals(myXp: number): { name: string; xp: number; me?: boolean }[] {
  const names = [
    "Алина К.", "Марк В.", "Соня Р.", "Тимур А.", "Лиза П.",
    "Даня С.", "Вика М.", "Артём Ж.", "Настя Л.", "Илья Б.",
  ];
  const seedRand = (i: number) => {
    const x = Math.sin(i * 99.13) * 10000;
    return x - Math.floor(x);
  };
  const rivals = names.map((name, i) => ({
    name,
    xp: Math.max(0, Math.round(myXp + (seedRand(i) - 0.45) * Math.max(120, myXp * 0.9))),
  }));
  return [...rivals, { name: "Ты", xp: myXp, me: true }].sort((a, b) => b.xp - a.xp);
}

const LEAGUE_TIERS = [
  { name: "Бронза", hue: 28 },
  { name: "Серебро", hue: 210 },
  { name: "Золото", hue: 45 },
  { name: "Сапфир", hue: 260 },
];

function Badge({ a, ctx }: { a: Achievement; ctx: AchievementCtx }) {
  const { level, goal, value } = tierOf(a, ctx);
  const Icon = ICONS[a.icon] ?? Sparkles;
  const ratio = Math.min(1, value / goal);
  const earned = level > 0;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3">
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
        style={{
          background: `hsl(${a.hue} 70% 55% / ${earned ? 0.2 : 0.08})`,
          border: `2px solid hsl(${a.hue} 70% 55% / ${earned ? 0.6 : 0.25})`,
          color: `hsl(${a.hue} 75% ${earned ? 60 : 45}%)`,
          opacity: earned ? 1 : 0.6,
        }}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-hi">{a.name}</span>
          <span className="font-mono text-[11px] text-lo">
            {level > 0 && <span className="text-accent">ур.{level} · </span>}
            {Math.min(value, goal)}/{goal}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-mid">{a.desc}</div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--glass-hi)/0.08)]">
          <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: `hsl(${a.hue} 70% 55%)` }} />
        </div>
      </div>
    </div>
  );
}

export function LeaguesScreen() {
  const setScreen = useApp((s) => s.setScreen);
  const game = useApp((s) => s.game);
  const data = useApp((s) => s.data);

  // контекст достижений — только по ГОТОВЫМ предметам (иначе нули soon-предметов
  // занижают среднюю готовность)
  const liveSubjects = LIVE_KEYS.map((k) => data[k]).filter(Boolean);
  const solidFloors = liveSubjects.reduce(
    (n, subj) => n + subj.floors.filter((f) => floorState(f) === "solid").length,
    0
  );
  const overall = Math.round(
    liveSubjects.reduce((s, subj) => s + overallReadiness(subj.floors), 0) /
      Math.max(1, liveSubjects.length)
  );
  const ctx: AchievementCtx = { game, solidFloors, overall };

  const rivals = React.useMemo(() => demoRivals(game.xp), [game.xp]);
  const myRank = rivals.findIndex((r) => r.me) + 1;
  const league = LEAGUE_TIERS[Math.min(LEAGUE_TIERS.length - 1, Math.floor(game.xp / 400))];

  return (
    <div className="min-h-[100dvh] w-full bg-bg-0">
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg-0/85 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setScreen("spire")}
          className="-ml-2 flex min-h-[44px] items-center gap-1.5 px-2 text-[13px] text-mid transition-colors hover:text-hi"
        >
          <ArrowLeft size={16} /> к Шпилю
        </button>
        <div className="hud-label text-[11px] text-lo">Рейтинги</div>
        <div className="w-[70px]" />
      </header>

      <main className="pb-nav mx-auto max-w-[760px] space-y-4 px-4 py-6">
        {/* лига */}
        <LiquidGlass sheen className="p-5 text-center">
          <div
            className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl"
            style={{
              background: `hsl(${league.hue} 80% 55% / 0.18)`,
              border: `2px solid hsl(${league.hue} 80% 55% / 0.6)`,
              color: `hsl(${league.hue} 85% 58%)`,
            }}
          >
            <Shield size={32} />
          </div>
          <div className="hud-label text-[10px] text-lo">Текущая лига</div>
          <h2 className="m-0 mt-1 font-serif text-2xl text-hi">{league.name} · лига</h2>
          <div className="mt-1 flex items-center justify-center gap-2 text-[13px] text-mid">
            <ChevronUp size={15} className="text-stable" /> Ты на <b className="text-hi">{myRank}-м</b> месте · {game.xp} XP
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.03)] p-2.5 text-left">
            <Info size={14} className="mt-0.5 shrink-0 text-lo" />
            <p className="m-0 text-[11px] leading-snug text-lo">
              Демо-таблица: соперники сгенерированы для показа. На проде здесь живой
              недельный рейтинг реальных учеников.
            </p>
          </div>
        </LiquidGlass>

        {/* таблица лиги */}
        <LiquidGlass className="overflow-hidden p-0">
          {rivals.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.02 * i }}
              className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0"
              style={{ background: r.me ? "rgb(var(--accent) / 0.1)" : undefined }}
            >
              <div
                className="w-6 text-center font-mono text-[13px] font-bold"
                style={{ color: i < 3 ? "rgb(var(--accent))" : "rgb(var(--lo))" }}
              >
                {i + 1}
              </div>
              <div
                className="grid h-8 w-8 place-items-center rounded-full text-[13px]"
                style={{
                  background: r.me ? "rgb(var(--accent) / 0.2)" : "rgb(var(--glass-hi) / 0.06)",
                  border: "1px solid rgb(var(--line) / 0.4)",
                }}
              >
                {i === 0 ? <Crown size={15} className="text-warn" /> : r.name[0]}
              </div>
              <div className="flex-1 text-[13px]" style={{ color: r.me ? "rgb(var(--hi))" : "rgb(var(--mid))", fontWeight: r.me ? 700 : 400 }}>
                {r.name}
              </div>
              <div className="font-mono text-[13px] text-hi">{r.xp} XP</div>
            </motion.div>
          ))}
        </LiquidGlass>

        {/* достижения */}
        <div>
          <h3 className="m-0 mb-2 px-1 font-serif text-lg text-hi">Достижения</h3>
          <div className="space-y-2.5">
            {ACHIEVEMENTS.map((a) => (
              <Badge key={a.id} a={a} ctx={ctx} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
