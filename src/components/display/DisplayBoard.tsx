"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Clock, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { usePolling } from "@/lib/hooks/usePolling";

type DoctorLane = {
  doctorId: string;
  doctorName: string;
  specialization: string;
  roomNumber: string | null;
  current: {
    id: string;
    displayToken: string;
    status: "CALLED" | "IN_PROGRESS" | "WAITING";
  } | null;
  next: Array<{ id: string; displayToken: string }>;
  waitingCount: number;
};

type Board = {
  clinicName: string;
  board: DoctorLane[];
  updatedAt: string;
};

export function DisplayBoard({ slug }: { slug: string }) {
  const [data, setData] = useState<Board | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [clock, setClock] = useState(new Date());
  const lastCalledRef = useRef<Map<string, string>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Live clock
  useEffect(() => {
    const i = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Fetch loop
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${slug}`, { cache: "no-store" });
      const body = await res.json();
      if (body?.success) {
        // Detect new CALLED tokens to play chime
        const next = body.data as Board;
        if (data) {
          for (const lane of next.board) {
            const prev = lastCalledRef.current.get(lane.doctorId);
            const now = lane.current?.displayToken;
            if (now && now !== prev && lane.current?.status === "CALLED") {
              lastCalledRef.current.set(lane.doctorId, now);
              if (soundOn) chime();
            } else if (now) {
              lastCalledRef.current.set(lane.doctorId, now);
            }
          }
        } else {
          // First load — seed the ref map without chime
          for (const lane of next.board) {
            if (lane.current?.displayToken) {
              lastCalledRef.current.set(
                lane.doctorId,
                lane.current.displayToken,
              );
            }
          }
        }
        setData(next);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, soundOn, data]);

  usePolling(load, 4000);

  function chime() {
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(880, 0, 0.25);
      playTone(1175, 0.2, 0.35);
    } catch {
      // ignore
    }
  }

  function goFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  const lanes = data?.board ?? [];

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 bg-black/30 px-8 py-4 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data?.clinicName ?? "Live queue"}
          </h1>
          <p className="text-xs text-emerald-200/80">Now serving</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold tracking-tight">
            {clock.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          <div className="text-xs text-emerald-200/70">
            {clock.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white/5 hover:bg-white/10"
            title={soundOn ? "Mute chime" : "Unmute"}
          >
            {soundOn ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={goFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white/5 hover:bg-white/10"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Lanes */}
      {lanes.length === 0 ? (
        <div className="flex min-h-[calc(100dvh-100px)] items-center justify-center text-emerald-200/60">
          {data ? "No active doctors right now." : "Loading..."}
        </div>
      ) : (
        <main
          className="grid gap-6 p-8"
          style={{
            gridTemplateColumns: `repeat(${Math.min(
              lanes.length,
              lanes.length === 1 ? 1 : lanes.length === 2 ? 2 : 3,
            )}, minmax(0, 1fr))`,
          }}
        >
          {lanes.map((lane) => (
            <Lane key={lane.doctorId} lane={lane} />
          ))}
        </main>
      )}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/30 px-8 py-2 text-center text-[10px] text-emerald-200/60 backdrop-blur">
        Please wait for your token to be called · Updates every 4 seconds
      </footer>
    </div>
  );
}

function Lane({ lane }: { lane: DoctorLane }) {
  const tone = lane.current?.status === "CALLED"
    ? "ring-amber-400"
    : lane.current?.status === "IN_PROGRESS"
      ? "ring-emerald-400"
      : "ring-white/10";

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
      {/* Doctor header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold">
            Dr. {lane.doctorName}
          </div>
          <div className="text-xs text-emerald-200/70">
            {lane.specialization}
            {lane.roomNumber && ` · Room ${lane.roomNumber}`}
          </div>
        </div>
      </div>

      {/* Current token */}
      <div className={`rounded-xl bg-black/30 p-6 text-center ring-2 ${tone}`}>
        <div className="text-[10px] font-medium uppercase tracking-widest text-emerald-200/80">
          {lane.current?.status === "IN_PROGRESS"
            ? "In progress"
            : lane.current?.status === "CALLED"
              ? "Now calling"
              : "Waiting for first patient"}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={lane.current?.displayToken ?? "empty"}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="mt-2 font-mono text-7xl font-bold tracking-tight text-white"
          >
            {lane.current?.displayToken ?? "—"}
          </motion.div>
        </AnimatePresence>
        {lane.current?.status === "CALLED" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="mt-2 text-sm font-semibold text-amber-300"
          >
            Please come to Room {lane.roomNumber ?? "—"}
          </motion.div>
        )}
      </div>

      {/* Upcoming */}
      <div>
        <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-emerald-200/70">
          <span>Up next</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lane.waitingCount} waiting
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {lane.next.length === 0 ? (
            <div className="col-span-5 rounded-md border border-dashed border-white/10 bg-black/20 p-3 text-center text-xs text-emerald-200/50">
              Queue clear
            </div>
          ) : (
            lane.next.map((tk, i) => (
              <div
                key={tk.id}
                className={`rounded-md border border-white/10 px-2 py-1.5 text-center font-mono text-sm font-semibold ${
                  i === 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-black/20 text-emerald-200/70"
                }`}
              >
                {tk.displayToken}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
