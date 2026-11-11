import { AuthForm } from "@/components/auth-form";
import { loginAction } from "../actions";
export default function Page() { return <AuthForm mode="login" action={loginAction} />; }
