import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ADMIN_COOKIE, verifySessionValue } from "./session";

export async function isAdmin(): Promise<boolean> {
  // Session checks compare against the current time, so they must run per request.
  await connection();
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionValue(value);
}

/** Call at the top of every admin page and admin Server Action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
