import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "press_admin";

export function expectedPin(): string {
  return process.env.PRESS_PIN || "2468";
}

function tokenFor(pin: string): string {
  return createHash("sha256").update(`press-bench:${pin}`).digest("hex");
}

export function pinMatches(input: string): boolean {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expectedPin()).digest();
  return timingSafeEqual(left, right);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === tokenFor(expectedPin());
}

export async function grantAdmin(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, tokenFor(expectedPin()), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
