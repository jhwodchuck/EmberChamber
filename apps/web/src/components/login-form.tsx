import { BootstrapAuthForm } from "@/components/bootstrap-auth-form";
import { PasskeySignInButton } from "@/components/passkey-sign-in-button";

export function LoginForm({
  continueTo,
  initialEntryMethod,
}: {
  continueTo?: string | null;
  initialEntryMethod?: "magic-link" | "device-link";
}) {
  return (
    <div className="space-y-0">
      <BootstrapAuthForm
        mode="signin"
        continueTo={continueTo}
        initialEntryMethod={initialEntryMethod}
      />
      <PasskeySignInButton continueTo={continueTo} />
    </div>
  );
}
