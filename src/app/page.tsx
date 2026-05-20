import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Root entry point. Send the user to the right dashboard depending on role.
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/portal");
  redirect("/dashboard");
}
