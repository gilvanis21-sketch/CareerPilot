import { ResetForm } from "@/components/forgot-form";
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <ResetForm token={(await params).token} />;
}
