import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 md:block">
        <Image
          src="/login-network.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-background/50" />
        <p className="absolute bottom-10 left-10 text-lg font-medium text-foreground">
          Agentic Recruiting
        </p>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center p-4 md:w-1/2">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              RA
            </div>
            <span className="text-lg font-semibold">Recruiter Agent</span>
          </div>

          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="absolute bottom-4 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href="https://kloudstack.co.uk"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground hover:underline"
          >
            kloudstack.co.uk
          </a>
        </p>
      </div>
    </div>
  );
}
