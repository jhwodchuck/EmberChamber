import { BootstrapAuthForm } from "@/components/bootstrap-auth-form";

export function RegisterForm({ continueTo }: { continueTo?: string | null }) {
  return <BootstrapAuthForm mode="join" continueTo={continueTo} />;
}
