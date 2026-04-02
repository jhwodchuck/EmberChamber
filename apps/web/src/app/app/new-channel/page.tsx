"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { channelsApi } from "@/lib/api";

export default function NewChannelPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", visibility: "private" });
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const channel = (await channelsApi.create({
        name: form.name,
        description: form.description || undefined,
        visibility: form.visibility as "public" | "private",
      })) as { id: string };
      toast.success("Channel created");
      router.push(`/app/channel/${channel.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col p-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
        Broadcast Community
      </p>
      <h2 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Create a channel</h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Channels stay available on web, but they are still the lighter-weight surface. Native
        clients remain preferred for sustained, higher-volume community activity.
      </p>
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Channel Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            required
            maxLength={128}
            placeholder="My Channel"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input resize-none"
            rows={3}
            maxLength={512}
            placeholder="What is this channel about?"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Visibility</label>
          <select name="visibility" value={form.visibility} onChange={handleChange} className="input">
            <option value="private">Private - invite only</option>
            <option value="public">Public - anyone can find and join</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isLoading}>
          {isLoading ? "Creating…" : "Create Channel"}
        </button>
      </form>
    </div>
  );
}
