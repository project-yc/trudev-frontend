// Shared entrance motion for the candidate flow screens.
//
// Every flow screen staggers its blocks with the same curve and the same
// delays, so moving from the landing page to the terms to a section intro reads
// as one surface being redrawn rather than three screens with three opinions
// about motion.

import { useReducedMotion } from 'motion/react'

export const FLOW_EASE = [0.16, 1, 0.3, 1]

export function useFlowRise() {
  const reduceMotion = useReducedMotion()
  return (delay = 0) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0 : 0.5,
      delay: reduceMotion ? 0 : delay,
      ease: FLOW_EASE,
    },
  })
}
