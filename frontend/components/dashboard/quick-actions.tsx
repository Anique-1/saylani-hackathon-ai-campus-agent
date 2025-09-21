"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, UserPlus, MessageSquare, BarChart3, Mail, FileText } from "lucide-react"

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false)

  const actions = [
    {
      icon: UserPlus,
      label: "Add Student",
      description: "Register a new student",
      action: () => console.log("Add student"),
    },
    {
      icon: MessageSquare,
      label: "Start Chat",
      description: "Begin AI conversation",
      action: () => console.log("Start chat"),
    },
    {
      icon: BarChart3,
      label: "View Analytics",
      description: "Check campus statistics",
      action: () => console.log("View analytics"),
    },
    {
      icon: Mail,
      label: "Send Email",
      description: "Send notification email",
      action: () => console.log("Send email"),
    },
    {
      icon: FileText,
      label: "Generate Report",
      description: "Create system report",
      action: () => console.log("Generate report"),
    },
  ]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="gradient-secondary">
          <Plus className="w-4 h-4 mr-2" />
          Quick Actions
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 glass-effect border-white/10" align="end">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <DropdownMenuItem
              key={action.label}
              onClick={action.action}
              className="flex items-start space-x-3 p-3 hover:bg-white/10 cursor-pointer"
            >
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">{action.label}</p>
                <p className="text-xs text-gray-400">{action.description}</p>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
