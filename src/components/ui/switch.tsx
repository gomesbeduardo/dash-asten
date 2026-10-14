"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"
import { CheckIcon } from "lucide-react"

/** Trilho + miolo: ligado = trilho preenchido com check; desligado = trilho vazado. */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-input bg-card transition-colors duration-200 ease-out outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-ring data-[state=checked]:bg-ring motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="group/thumb pointer-events-none grid size-5 translate-x-1 place-items-center rounded-full bg-input text-ring shadow-sm transition-colors transition-transform duration-200 ease-out data-[state=checked]:translate-x-7 data-[state=checked]:bg-primary-foreground motion-reduce:transition-none"
      >
        <CheckIcon
          aria-hidden
          className="size-3.5 opacity-0 group-data-[state=checked]/thumb:opacity-100"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
