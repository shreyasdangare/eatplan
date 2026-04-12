"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageSquare, Send } from "lucide-react";
import Link from "next/link";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const router = useRouter();

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setFeedbackStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback })
      });
      if (!res.ok) throw new Error("Failed to send");
      setFeedbackStatus("success");
      setFeedback("");
      setTimeout(() => setFeedbackStatus("idle"), 3000);
    } catch {
      setFeedbackStatus("error");
      setTimeout(() => setFeedbackStatus("idle"), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 lg:px-8 space-y-6">
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          <MessageSquare className="h-8 w-8 text-stone-400" /> Send Feedback
        </h1>
        <p className="mt-2 text-stone-500 dark:text-stone-400 font-medium">
          Have an idea or found a bug? Let the developers know! Your feedback goes directly to the team.
        </p>
      </div>

      <section className="glass-panel overflow-hidden rounded-[2.5rem] p-6 sm:p-8 shadow-sm">
        <form onSubmit={submitFeedback} className="space-y-4">
           <div>
             <label htmlFor="feedback_message" className="mb-2 block text-sm font-semibold text-stone-700 dark:text-stone-300">
               Your Message
             </label>
             <textarea
               id="feedback_message"
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
               placeholder="What's on your mind? Did you encounter an issue? Any feature requests?"
               required
               rows={6}
               className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 transition-all placeholder:text-stone-400"
             />
           </div>
           
           <button
             type="submit"
             disabled={feedbackStatus === "sending" || !feedback.trim()}
             className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-base font-bold text-white shadow-md transition-all active:scale-[0.98] hover:bg-orange-700 disabled:opacity-50 disabled:active:scale-100 dark:bg-orange-600 dark:text-white"
           >
             {feedbackStatus === "sending" ? "Sending..." : feedbackStatus === "success" ? "Message Sent!" : feedbackStatus === "error" ? "Failed to send" : <><Send className="h-4 w-4" /> Send Message</>}
           </button>
           
           {feedbackStatus === "success" && (
             <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center mt-2">
               Thanks for helping us improve EatPlan!
             </p>
           )}
           {feedbackStatus === "error" && (
             <p className="text-sm font-semibold text-red-600 dark:text-red-400 text-center mt-2">
               Oops. There was a problem sending your feedback.
             </p>
           )}
        </form>
      </section>
    </div>
  );
}
