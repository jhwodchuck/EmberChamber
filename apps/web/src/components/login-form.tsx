import { BootstrapAuthForm } from "@/components/bootstrap-auth-form";

export function LoginForm({
  continueTo,
  initialEntryMethod,
}: {
  continueTo?: string | null;
  initialEntryMethod?: "magic-link" | "device-link";
}) {
  return (
    <BootstrapAuthForm
      mode="signin"
      continueTo={continueTo}
      initialEntryMethod={initialEntryMethod}
    />
  );
}
