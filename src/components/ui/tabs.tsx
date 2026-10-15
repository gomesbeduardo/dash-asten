"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { molaAba } from "@/components/app/motion/tokens"

const TabsCtx = React.createContext<{ valor: string | undefined; grupo: string }>({
  valor: undefined,
  grupo: "tabs",
})

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const grupo = React.useId()
  const [interno, setInterno] = React.useState(defaultValue)
  const valor = value ?? interno
  return (
    <TabsCtx.Provider value={{ valor, grupo }}>
      <LayoutGroup id={grupo}>
        <TabsPrimitive.Root
          data-slot="tabs"
          data-orientation={orientation}
          value={valor}
          onValueChange={(v) => {
            setInterno(v)
            onValueChange?.(v)
          }}
          className={cn(
            "group/tabs flex gap-2 data-horizontal:flex-col",
            className
          )}
          {...props}
        />
      </LayoutGroup>
    </TabsCtx.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit border border-border items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-12 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { valor } = React.useContext(TabsCtx)
  const reduzido = useReducedMotion()
  const ativa = valor === value
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md px-5 text-base font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 ease-out outline-none motion-reduce:transition-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:text-brand-ink [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        className
      )}
      {...props}
    >
      {ativa && (
        <motion.span
          layoutId="tab-ativa"
          aria-hidden
          className="absolute inset-0 rounded-md border border-ring/50 bg-brand-soft"
          transition={
            reduzido ? { duration: 0 } : molaAba
          }
        >
          <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-ring" />
        </motion.span>
      )}
      <span className="relative">{children}</span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
