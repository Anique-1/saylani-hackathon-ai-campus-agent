"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface FadeInProps {
  children: React.ReactNode
  direction?: "up" | "down" | "left" | "right" | "scale"
  delay?: number
  duration?: number
  className?: string
}

export function FadeIn({ children, direction = "up", delay = 0, duration = 600, className }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true)
          }, delay)
        }
      },
      { threshold: 0.1 },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [delay])

  const getAnimationClass = () => {
    if (!isVisible) return "opacity-0"

    switch (direction) {
      case "up":
        return "animate-slide-up"
      case "down":
        return "animate-slide-down"
      case "left":
        return "animate-slide-left"
      case "right":
        return "animate-slide-right"
      case "scale":
        return "animate-scale-in"
      default:
        return "animate-slide-up"
    }
  }

  return (
    <div ref={ref} className={cn(getAnimationClass(), className)} style={{ animationDuration: `${duration}ms` }}>
      {children}
    </div>
  )
}
