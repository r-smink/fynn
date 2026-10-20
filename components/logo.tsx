import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  logoLight = "/brand/fyndable-logo.png",
  logoDark = "/brand/fyndable-logo-dark.png",
  className,
}: {
  logoLight?: string;
  logoDark?: string;
  className?: string;
}) {
  return (
    <>
      <Image
        src={logoLight}
        alt="Fyndable"
        width={1024}
        height={176}
        unoptimized
        className={cn("h-auto w-auto dark:hidden", className)}
      />
      <Image
        src={logoDark}
        alt="Fyndable"
        width={1024}
        height={176}
        unoptimized
        className={cn("hidden h-auto w-auto dark:block", className)}
      />
    </>
  );
}
