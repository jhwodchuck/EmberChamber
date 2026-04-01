"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { channelsApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function NewChannelPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", visibility: "public" });
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const channel = await channelsApi.create({
        name: form.name,
        description: form.description || undefined,
        visibility: form.visibility as "public" | "private",
      }) as { id: string };
      toast.success("Channel created!");
      router.push(`/app/channel/${channel.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create channel");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto p-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Create Channel</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Channel Name</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} className="input" required maxLength={128} placeholder="My Channel" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} className="input resize-none" rows={3} maxLength={512} placeholder="What is this channel about?" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Visibility</label>
          <select name="visibility" value={form.visibility} onChange={handleChange} className="input">
            <option value="public">Public — anyone can find and join</option>
            <option value="private">Private — invite only</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Channel"}
        </button>
      </form>
    </div>
  );
}
