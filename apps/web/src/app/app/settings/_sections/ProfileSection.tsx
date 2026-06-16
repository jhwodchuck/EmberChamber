interface ProfileSectionProps {
  user: {
    displayName?: string | null;
    username?: string | null;
    email?: string | null;
    bio?: string | null;
  } | null;
  profile: { displayName: string; bio: string };
  setProfile: React.Dispatch<React.SetStateAction<{ displayName: string; bio: string }>>;
  isSavingProfile: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ProfileSection({
  user,
  profile,
  setProfile,
  isSavingProfile,
  onSubmit,
}: ProfileSectionProps) {
  return (
    <form
      id="settings-panel-profile"
      role="tabpanel"
      aria-labelledby="settings-tab-profile"
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
          {(user?.displayName ?? user?.username ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">
            {user?.displayName || "Unnamed user"}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            @{user?.username}
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="settings-display-name"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Display Name
        </label>
        <input
          id="settings-display-name"
          name="displayName"
          type="text"
          value={profile.displayName}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              displayName: event.target.value,
            }))
          }
          className="input"
          maxLength={128}
          autoComplete="name"
        />
      </div>

      <div>
        <label
          htmlFor="settings-bio"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Private bio
        </label>
        <textarea
          id="settings-bio"
          name="bio"
          value={profile.bio}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              bio: event.target.value,
            }))
          }
          className="input resize-none"
          rows={3}
          maxLength={512}
          placeholder="Optional profile note for trusted circles…"
        />
      </div>

      <div>
        <label
          htmlFor="settings-email"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Email
        </label>
        <input
          id="settings-email"
          type="email"
          value={user?.email ?? ""}
          className="input opacity-60"
          disabled
        />
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Email stays tied to bootstrap and recovery. Changes are not
          available in beta.
        </p>
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={isSavingProfile}
      >
        {isSavingProfile ? "Saving Profile…" : "Save Profile"}
      </button>
    </form>
  );
}
