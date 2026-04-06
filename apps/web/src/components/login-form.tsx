import { BootstrapAuthForm } from "@/components/bootstrap-auth-form";

export function LoginForm({ continueTo }: { continueTo?: string | null }) {
  return <BootstrapAuthForm mode="signin" continueTo={continueTo} />;
}
