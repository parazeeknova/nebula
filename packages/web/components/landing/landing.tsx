import Link from "next/link";

import {
  BotIcon,
  DbIcon,
  HashIcon,
  PanelIcon,
  SearchIcon,
  ShareIcon,
  SparkleIcon,
  UsersIcon,
} from "../icons";
import { HeroMock } from "./hero-mock";

const LOG = "font-mono text-[11px] tracking-[0.18em] uppercase";

const features = [
  {
    body: "Channels where humans and agents share one surface. Answers stream live for everyone present — nobody screenshots a chat again.",
    icon: HashIcon,
    num: "01",
    title: "Rooms, not tabs",
  },
  {
    body: "Every room remembers every thread it's ever had. A workspace rollup shows what's moving across the whole company.",
    icon: DbIcon,
    num: "02",
    title: "Memory that compounds",
  },
  {
    body: "Two people circling the same question? Both angles stream in parallel, then Neb merges them into one synthesized answer.",
    icon: ShareIcon,
    num: "03",
    title: "Convergence engine",
  },
  {
    body: "Research, marketing, your own bots — each scoped to its room with its own tools, tagged with @ like any teammate.",
    icon: BotIcon,
    num: "04",
    title: "Agents with tools",
  },
  {
    body: "Each message is answered from room memory when it can be, and routed to a specialist agent only when it must be.",
    icon: SearchIcon,
    num: "05",
    title: "Routing per message",
  },
  {
    body: "Rooms live on one infinite canvas per company — progress, presence, and in-flight threads visible at a glance.",
    icon: PanelIcon,
    num: "06",
    title: "A live canvas",
  },
];

export const Landing = () => (
  <div className="relative">
    {/* nav */}
    <header className="border-line/70 supports-[backdrop-filter]:bg-abyss/70 fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="bg-blurple grid h-6 w-6 place-items-center text-[12px] font-extrabold text-white shadow-[0_0_18px_rgba(88,101,242,0.6)]">
            N
          </span>
          <span className="text-[15px] font-bold tracking-tight text-white">
            neb
          </span>
        </a>
        <nav
          className="text-ink-faint ml-4 hidden items-center gap-6 text-[13px] font-semibold sm:flex"
          aria-label="Sections"
        >
          <a className="transition hover:text-white" href="#features">
            Features
          </a>
          <a className="transition hover:text-white" href="#how">
            How it works
          </a>
          <a className="transition hover:text-white" href="#use-cases">
            Use cases
          </a>
        </nav>
        <Link
          href="/app"
          className="bg-blurple hover:bg-blurple-deep ml-auto px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_18px_rgba(88,101,242,0.45)] transition"
        >
          Open app
        </Link>
      </div>
    </header>

    <main id="top">
      {/* ── hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pt-32 pb-20 sm:pt-36">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 65% at 50% 0%, black 30%, transparent 75%)",
            backgroundImage:
              "linear-gradient(to right, rgba(244,245,247,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,245,247,0.035) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 90% 65% at 50% 0%, black 30%, transparent 75%)",
          }}
          aria-hidden
        />
        <div
          className="bg-blurple/15 pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] max-w-[90vw] -translate-x-1/2 blur-[130px]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl">
          <p
            className={`${LOG} text-blurple animate-fade-up flex items-center justify-center gap-2`}
          >
            <SparkleIcon className="h-3 w-3" />
            Shared AI workspace
          </p>
          <h1 className="animate-fade-up-1 mt-5 text-center text-[40px] leading-[1.04] font-extrabold tracking-tight text-balance text-white sm:text-[56px] md:text-[64px]">
            One brain.
            <br />
            <span className="text-blurple">Every teammate.</span>
          </h1>
          <p className="text-ink-dim animate-fade-up-2 mx-auto mt-6 max-w-xl text-center text-[15px] leading-relaxed text-pretty sm:text-[17px]">
            Neb gives each room one conversation and one memory — so five people
            stop asking the same question in five private ChatGPT tabs, and
            answers never die in solo chats again.
          </p>
          <div className="animate-fade-up-3 mt-8 flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="bg-blurple hover:bg-blurple-deep px-6 py-3 text-[14px] font-bold text-white shadow-[0_6px_28px_rgba(88,101,242,0.5)] transition"
            >
              Open the workspace
            </Link>
            <a
              href="#features"
              className="border-line hover:border-line-soft hover:bg-panel text-ink-dim border px-6 py-3 text-[14px] font-bold transition hover:text-white"
            >
              See how it works
            </a>
          </div>

          <div className="animate-fade-up-4 relative mx-auto mt-16 max-w-4xl sm:mt-20">
            <HeroMock />
          </div>
        </div>
      </section>

      {/* ── tension ──────────────────────────────────────── */}
      <section className="border-line border-t px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`${LOG} text-ink-ghost`}>The quiet tax on every team</p>
          <p className="mt-5 text-[22px] leading-snug font-bold text-balance text-white sm:text-[28px]">
            Context dies in private chats.
          </p>
          <p className="text-ink-dim mx-auto mt-4 max-w-xl text-[14.5px] leading-relaxed text-pretty sm:text-[15.5px]">
            Prompts, answers, and half-finished reasoning sit locked in solo
            tabs. The same question gets asked five times, and nobody's work
            compounds. Neb is solved the day your team stops screenshotting
            chats to each other.
          </p>
          <div
            className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-px"
            aria-hidden
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="border-line bg-panel flex items-center gap-2 border px-3 py-2.5"
                style={{ opacity: 1 - i * 0.16 }}
              >
                <span className="bg-blurple/70 grid h-5 w-5 shrink-0 place-items-center text-[9px] font-extrabold text-white">
                  {["SC", "MK", "JL", "AR", "TW"][i - 1]}
                </span>
                <span className="text-ink-ghost truncate font-mono text-[9.5px]">
                  same_q_final{i}.png
                </span>
              </div>
            ))}
            <div className="border-blurple/50 bg-blurple-soft/40 flex items-center justify-center gap-1.5 border px-3 py-2.5">
              <span className="bg-blurple grid h-5 w-5 place-items-center text-[9px] font-extrabold text-white">
                N
              </span>
              <span className="font-mono text-[9.5px] font-bold text-white">
                asked once
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── features grid ────────────────────────────────── */}
      <section
        id="features"
        className="border-line border-t px-5 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${LOG} text-blurple`}>Features</p>
              <h2 className="mt-3 text-[28px] leading-tight font-extrabold tracking-tight text-balance text-white sm:text-[36px]">
                Everything in the room,
                <br className="hidden sm:block" /> nothing lost in tabs
              </h2>
            </div>
            <p className="text-ink-faint max-w-sm text-[13.5px] leading-relaxed text-pretty">
              Rooms, memory, routing, and convergence — one system, designed so
              the team's knowledge compounds instead of evaporating.
            </p>
          </div>

          <div className="bg-line mt-10 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.num}
                className="group bg-abyss hover:bg-panel relative p-6 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="border-line text-ink-dim group-hover:border-blurple/50 grid h-9 w-9 place-items-center border transition-colors group-hover:text-white">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="text-ink-ghost font-mono text-[10px] tracking-[0.2em]">
                    {f.num}
                  </span>
                </div>
                <h3 className="mt-5 text-[15.5px] font-bold text-white">
                  {f.title}
                </h3>
                <p className="text-ink-faint mt-2 text-[13px] leading-relaxed text-pretty">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── how it works ─────────────────────────────────── */}
      <section id="how" className="border-line border-t px-5 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className={`${LOG} text-blurple`}>How it works</p>
            <h2 className="mt-3 text-[28px] leading-tight font-extrabold tracking-tight text-balance text-white sm:text-[36px]">
              Ask the room.
              <br />
              The room remembers.
            </h2>
            <p className="text-ink-dim mt-4 max-w-md text-[14.5px] leading-relaxed text-pretty">
              A message lands, the router decides — memory first, specialist
              agent when needed — and overlaps converge instead of colliding.
            </p>
          </div>

          <ol className="relative space-y-0">
            {[
              {
                d: "Prompt normally or @ an agent. A thread starts in the room — visible to everyone, not buried in a DM.",
                t: "Ask once, in the open",
              },
              {
                d: "Answered straight from room memory when it can be; handed to a specialist agent with the right tools when it must be.",
                t: "Routing decides per message",
              },
              {
                d: "Two people circling the same idea from different angles? Both streams run in parallel, live, then merge into one synthesized answer.",
                t: "Overlaps converge",
              },
              {
                d: "Every thread feeds the room's memory. A workspace rollup shows what's moving across every room, company-wide.",
                t: "Memory compounds",
              },
            ].map((s, i) => (
              <li key={s.t} className="relative flex gap-5 pb-9 last:pb-0">
                {i < 3 && (
                  <span
                    className="bg-line absolute top-11 left-[19px] h-[calc(100%-2.75rem)] w-px"
                    aria-hidden
                  />
                )}
                <span className="border-line bg-panel text-ink-dim grid h-10 w-10 shrink-0 place-items-center border font-mono text-[12px] font-bold">
                  {i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-[15px] font-bold text-white">{s.t}</h3>
                  <p className="text-ink-faint mt-1.5 max-w-md text-[13px] leading-relaxed text-pretty">
                    {s.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── use cases ────────────────────────────────────── */}
      <section
        id="use-cases"
        className="border-line border-t px-5 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className={`${LOG} text-blurple`}>Two framings, one surface</p>
          <div className="bg-line mt-8 grid grid-cols-1 gap-px md:grid-cols-2">
            <article className="bg-abyss hover:bg-panel group relative p-7 transition-colors sm:p-9">
              <UsersIcon className="text-blurple h-5 w-5" />
              <h3 className="mt-5 text-[19px] font-extrabold tracking-tight text-white">
                One brain, five people
              </h3>
              <p className="text-ink-faint mt-3 text-[13.5px] leading-relaxed text-pretty">
                A team's shared AI chat where memory compounds. It already knows
                what a teammate asked an hour ago — and answers stream live for
                everyone in the room, not just the asker.
              </p>
              <p className="text-ink-ghost mt-5 font-mono text-[10.5px] tracking-[0.14em] uppercase">
                For teams shipping together
              </p>
            </article>
            <article className="bg-abyss hover:bg-panel group relative p-7 transition-colors sm:p-9">
              <ShareIcon className="text-blurple h-5 w-5" />
              <h3 className="mt-5 text-[19px] font-extrabold tracking-tight text-white">
                Ask the room
              </h3>
              <p className="text-ink-faint mt-3 text-[13.5px] leading-relaxed text-pretty">
                A live Q&A brain for any community. Questions and answers stream
                on one shared surface, repeats merge instead of piling up — and
                an FAQ builds itself over time.
              </p>
              <p className="text-ink-ghost mt-5 font-mono text-[10.5px] tracking-[0.14em] uppercase">
                For communities answering together
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── closing CTA ──────────────────────────────────── */}
      <section className="border-line relative overflow-hidden border-t px-5 py-24 sm:py-28">
        <div
          className="bg-blurple/15 pointer-events-none absolute top-1/2 left-1/2 h-64 w-[36rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-[32px] leading-[1.05] font-extrabold tracking-tight text-balance text-white sm:text-[46px]">
            Stop asking the same question five times.
          </h2>
          <p className="text-ink-dim mx-auto mt-5 max-w-md text-[14.5px] leading-relaxed text-pretty">
            One shared brain per room, on a live canvas — smarter every time
            your team uses it.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="bg-blurple hover:bg-blurple-deep px-7 py-3.5 text-[14px] font-bold text-white shadow-[0_6px_28px_rgba(88,101,242,0.5)] transition"
            >
              Open the workspace
            </Link>
          </div>
        </div>
      </section>
    </main>

    {/* footer */}
    <footer className="border-line border-t px-5 py-8">
      <div className="text-ink-ghost mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px]">
        <span className="flex items-center gap-2">
          <span className="bg-blurple grid h-4 w-4 place-items-center text-[9px] font-extrabold text-white">
            N
          </span>
          <span className="text-ink-faint font-sans text-[12.5px] font-bold">
            neb
          </span>
        </span>
        <span>© 2026</span>
        <span className="ml-auto flex flex-wrap gap-x-6 gap-y-2 tracking-[0.08em] uppercase">
          <span>SpacetimeDB · realtime state</span>
          <span>Honcho · room memory</span>
          <span>Pluggable agents</span>
        </span>
      </div>
    </footer>
  </div>
);
