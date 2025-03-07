"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

const sizes = {
  sm: { container: 32, logo: 24 },
  md: { container: 40, logo: 32 },
  lg: { container: 48, logo: 40 },
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const { theme } = useTheme()
  const dimensions = sizes[size]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg",
          "bg-gradient-to-b from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700",
          "shadow-lg shadow-amber-500/20 dark:shadow-amber-700/20",
        )}
        style={{
          width: dimensions.container,
          height: dimensions.container,
        }}
      >
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-03-05%20at%2015.49.43-VeSWtgiGyFD1UUtA0GyTFx1Qhtx4Sq.jpeg"
          alt="Tu Envío Express Logo"
          width={dimensions.logo}
          height={dimensions.logo}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none tracking-tight">Tu Envío</span>
          <span className="text-sm font-medium text-muted-foreground">Express</span>
        </div>
      )}
    </div>
  )
}

