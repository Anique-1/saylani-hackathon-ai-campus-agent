"use client"

import { Bot, Users, BarChart3, MessageSquare, Shield, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Bot,
    title: "AI-Powered Assistant",
    description: "Natural language processing for intuitive campus administration and NUST information queries.",
    gradient: "gradient-primary",
  },
  {
    icon: Users,
    title: "Student Management",
    description:
      "Add, update, and manage student records with automatic email notifications and comprehensive tracking.",
    gradient: "gradient-secondary",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time insights into campus statistics, department breakdowns, and student activity metrics.",
    gradient: "gradient-accent",
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    description: "Instant responses with streaming capabilities for seamless communication with the AI agent.",
    gradient: "gradient-primary",
  },
  {
    icon: Shield,
    title: "Secure Authentication",
    description: "JWT-based security with role-based access control to protect sensitive campus data.",
    gradient: "gradient-secondary",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized performance with instant search, quick responses, and efficient data processing.",
    gradient: "gradient-accent",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-background to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">
            Powerful Features for
            <span className="block gradient-primary bg-clip-text text-transparent">Modern Campus Management</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto text-balance">
            Everything you need to efficiently manage your campus operations with the power of artificial intelligence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.title}
                className="glass-effect border-white/10 hover:border-white/20 transition-all duration-300 group hover:scale-105"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-8">
                  <div
                    className={`w-12 h-12 ${feature.gradient} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-serif font-semibold text-white mb-4">{feature.title}</h3>

                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
