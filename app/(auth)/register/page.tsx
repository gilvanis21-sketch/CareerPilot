import { AuthForm } from "@/components/auth-form";
import { registerAction } from "../actions";
export default function Page() { return <AuthForm mode="register" action={registerAction} />; }
