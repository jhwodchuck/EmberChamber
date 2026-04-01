"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { conversationsApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function NewGroupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const group = (await conversationsApi.createGroup({
        name: form.name,
        description: form.description || undefined,
        isEncrypted: false,
      })) as { id: string };

      toast.success("Group created");
      router.push(`/app/chat/${group.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500 mb-2">
        Private Community
      </p>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        Create an invite-only group
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Groups in this starter are hosted communities with role-based admin
        controls. Use invite links to add members once the group is created.
      </p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Group name
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input"
            required
            maxLength={128}
            placeholder="Neighborhood organizers"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input resize-none"
            rows={4}
            maxLength={512}
            placeholder="Explain the purpose, posting norms, or membership rules."
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Current privacy boundary
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Group content is server-managed in this starter. Direct-message E2EE
            is planned separately; it is not implied for groups here.
          </p>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create group"}
        </button>
      </form>
    </div>
  );
}
