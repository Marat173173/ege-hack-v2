"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Flame, Trophy, Target, CalendarClock, Bell, Settings2,
  Volume2, Sun, Moon, Gauge, Pencil, Check, TrendingUp, type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { XpRing } from "@/components/ui/xp-ring";
import { Toggle } from "@/components/ui/toggle";
import { levelProgress } from "@/lib/gamification";
import { AVATARS, avatarHueFor, daysToExam, type Profile } from "@/lib/profile";
import { computeScore } from "@/lib/score-model";
import { CARDS, LIVE_KEYS, accentForKey } from "@/data/catalog";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <LiquidGlass className="p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={15} className="text-accent" />
        <h3 className="m-0 hud-label text-[11px] text-mid">{title}</h3>
      </div>
      {children}
    </LiquidGlass>
  );
}

function Stat({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div className="rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3 text-center">
      <div className="font-mono text-[22px] font-extrabold leading-none" style={{ color: color ?? "rgb(var(--hi))" }}>
        {value}
      </div>
      <div className="mt-1.5 hud-label text-[10px] text-lo">{label}</div>
    </div>
  );
}

export function ProfileScreen() {
  const setScreen = useApp((s) => s.setScreen);
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const game = useApp((s) => s.game);
  const data = useApp((s) => s.data);
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  const lightMode = useApp((s) => s.lightMode);
  const toggleLight = useApp((s) => s.toggleLight);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Profile>(profile);
  React.useEffect(() => setDraft(profile), [profile]);

  const lvl = levelProgress(game.xp);
  const days = daysToExam(profile.examDate);

  function saveEdit() {
    updateProfile({
      name: draft.name.trim() || "Ученик",
      avatarEmoji: draft.avatarEmoji,
      avatarHue: draft.avatarHue,
      targetScore: Math.min(100, Math.max(40, draft.targetScore || 80)),
      examDate: draft.examDate,
    });
    setEditing(false);
  }

  return (
    <div className="min-h-[100dvh] w-full bg-bg-0">
      <header
        className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg-0/85 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setScreen("spire")}
          className="-ml-2 flex min-h-[44px] items-center gap-1.5 px-2 text-[13px] text-mid transition-colors hover:text-hi active:text-hi"
        >
          <ArrowLeft size={16} /> к Шпилю
        </button>
        <div className="hud-label text-[11px] text-lo">Личный кабинет</div>
        <div className="w-[70px]" />
      </header>

      <main className="pb-nav mx-auto max-w-[760px] space-y-4 px-4 py-6">
        {/* ——— шапка профиля ——— */}
        <LiquidGlass sheen className="relative p-5 md:p-6">
          <div className="flex items-center gap-4">
            <div
              className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-2xl text-[34px]"
              style={{
                background: `hsl(${profile.avatarHue} 70% 55% / 0.16)`,
                border: `2px solid hsl(${profile.avatarHue} 70% 55% / 0.5)`,
                boxShadow: `0 0 30px -6px hsl(${profile.avatarHue} 70% 55% / 0.5)`,
              }}
            >
              {profile.avatarEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="m-0 truncate font-serif text-2xl text-hi">{profile.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mid">
                <span className="flex items-center gap-1">
                  <Trophy size={12} className="text-accent" /> Уровень {lvl.level}
                </span>
                <span className="flex items-center gap-1">
                  <Flame size={12} className="text-warn" /> {game.streak} дн
                </span>
                <span className="flex items-center gap-1">
                  <Target size={12} className="text-stable" /> цель {profile.targetScore}
                </span>
              </div>
            </div>
            <button
              onClick={() => (editing ? saveEdit() : setEditing(true))}
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.04)] px-3 py-2 text-[12px] text-hi transition-colors hover:bg-[rgb(var(--glass-hi)/0.08)] active:bg-[rgb(var(--glass-hi)/0.12)]"
            >
              {editing ? <Check size={14} /> : <Pencil size={13} />}
              {editing ? "Готово" : "Изменить"}
            </button>
          </div>

          {/* редактор профиля */}
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 space-y-4 overflow-hidden border-t border-line pt-4"
            >
              <div>
                <label className="mb-1.5 block hud-label text-[10px] text-lo">Имя</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  maxLength={24}
                  className="w-full rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.04)] px-3 py-2.5 text-[15px] text-hi outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block hud-label text-[10px] text-lo">Аватар</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a, i) => (
                    <button
                      key={a}
                      onClick={() =>
                        setDraft((d) => ({ ...d, avatarEmoji: a, avatarHue: avatarHueFor(i) }))
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl border text-[20px] transition-all"
                      style={{
                        borderColor: draft.avatarEmoji === a ? "rgb(var(--accent))" : "rgb(var(--line)/0.4)",
                        background:
                          draft.avatarEmoji === a ? "rgb(var(--accent)/0.12)" : "rgb(var(--glass-hi)/0.02)",
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block hud-label text-[10px] text-lo">Целевой балл</label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={draft.targetScore}
                    onChange={(e) => setDraft((d) => ({ ...d, targetScore: +e.target.value }))}
                    className="w-full rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.04)] px-3 py-2.5 text-[15px] text-hi outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block hud-label text-[10px] text-lo">Дата ЕГЭ</label>
                  <input
                    type="date"
                    value={draft.examDate ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, examDate: e.target.value || null }))}
                    className="w-full rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.04)] px-3 py-2.5 text-[14px] text-hi outline-none focus:border-accent"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </LiquidGlass>

        {/* ——— дашборд успеха ——— */}
        <Section icon={TrendingUp} title="Дашборд успеха">
          <div className="mb-4 flex items-center gap-4">
            <XpRing ratio={lvl.ratio} level={lvl.level} size={64} stroke={6} />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[18px] font-extrabold text-hi">{game.xp}</span>
                <span className="text-[12px] text-lo">XP всего</span>
              </div>
              <div className="mt-1 text-[11px] text-mid">
                До уровня {lvl.level + 1}: ещё <b className="text-hi">{Math.max(0, lvl.span - lvl.into)}</b> XP
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--glass-hi)/0.08)]">
                <div className="h-full rounded-full bg-accent" style={{ width: `${lvl.ratio * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat value={<><Flame size={16} className="inline -translate-y-0.5 text-warn" /> {game.streak}</>} label="Серия дней" />
            <Stat value={<>{game.dailyXp}<span className="text-lo">/{game.dailyGoal}</span></>} label="Цель сегодня" />
            <Stat value={game.bestCombo} label="Лучшее комбо" color="#FF5C6E" />
          </div>

          {/* прогресс по предметам */}
          <div className="mt-4 space-y-3">
            {CARDS.filter((c) => LIVE_KEYS.includes(c.key)).map((c) => {
              const subj = data[c.key];
              if (!subj) return null;
              const sc = computeScore(subj);
              const acc = accentForKey(c.key).accent;
              return (
                <div key={c.key} className="rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-hi">{c.short}</span>
                    <span className="font-mono text-[12px]" style={{ color: `rgb(${acc})` }}>
                      {sc.min}–{sc.max}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-[rgb(var(--glass-hi)/0.06)]">
                    <div
                      className="absolute top-0 h-full rounded-full"
                      style={{ left: `${sc.min}%`, width: `${Math.max(2, sc.max - sc.min)}%`, background: `rgb(${acc})` }}
                    />
                    <div
                      className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-hi"
                      style={{ left: `${subj.goal}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-lo">
                    {sc.solid}/{sc.total} тем монолит · стабильность {sc.aS}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* переход к рейтингам и достижениям */}
          <button
            onClick={() => setScreen("leagues")}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-accent/40 bg-accent/[0.08] px-4 py-3 text-left transition-colors hover:bg-accent/[0.14]"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-hi">
              <Trophy size={16} className="text-accent" /> Рейтинги и достижения
            </span>
            <span className="font-mono text-[11px] text-accent">соревнуйся →</span>
          </button>
        </Section>

        {/* ——— настройки уведомлений ——— */}
        <Section icon={Bell} title="Уведомления">
          {([
            ["daily", "Ежедневное напоминание заниматься", Bell],
            ["streakRisk", "«Серия под угрозой» вечером", Flame],
            ["weekly", "Недельный отчёт о прогрессе", TrendingUp],
            ["parent", "Копия отчёта родителю", Target],
          ] as const).map(([key, label, Ico]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0"
            >
              <span className="flex items-center gap-2.5 text-[13px] text-hi">
                <Ico size={15} className="text-mid" /> {label}
              </span>
              <Toggle
                checked={profile.notify[key]}
                onChange={(v) => updateProfile({ notify: { ...profile.notify, [key]: v } })}
                label={label}
              />
            </div>
          ))}
          <p className="m-0 mt-3 text-[11px] leading-snug text-lo">
            Напоминания приходят на устройство. Реальная отправка push/e-mail подключается на бэкенде.
          </p>
        </Section>

        {/* ——— настройки приложения ——— */}
        <Section icon={Settings2} title="Приложение">
          <div className="flex items-center justify-between gap-3 border-b border-line py-3">
            <span className="flex items-center gap-2.5 text-[13px] text-hi">
              {theme === "dark" ? <Moon size={15} className="text-mid" /> : <Sun size={15} className="text-mid" />}
              Тёмная тема
            </span>
            <Toggle checked={theme === "dark"} onChange={() => toggleTheme()} label="Тёмная тема" />
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-line py-3">
            <span className="flex items-center gap-2.5 text-[13px] text-hi">
              <Volume2 size={15} className="text-mid" /> Звуки
            </span>
            <Toggle checked={profile.sound} onChange={(v) => updateProfile({ sound: v })} label="Звуки" />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2.5 text-[13px] text-hi">
              <Gauge size={15} className="text-mid" /> Лёгкий режим (экономия батареи)
            </span>
            <Toggle checked={lightMode} onChange={() => toggleLight()} label="Лёгкий режим" />
          </div>
        </Section>

        {days != null && (
          <div className="flex items-center justify-center gap-2 pb-4 font-hand text-[18px] text-mid">
            <CalendarClock size={15} className="text-lo" /> До ЕГЭ осталось {days} дней — держи темп!
          </div>
        )}
      </main>
    </div>
  );
}
