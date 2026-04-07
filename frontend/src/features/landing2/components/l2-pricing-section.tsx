import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { fadeUp, stagger, revealUp } from "../lib/animations";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for individual creators getting started.",
    features: [
      "5 posts per month",
      "1 social account",
      "Basic AI generation (GPT-4o)",
      "Canvas editor",
      "7-day content calendar",
    ],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For serious creators and small teams ready to scale.",
    features: [
      "Unlimited posts",
      "10 social accounts",
      "Multi-model AI (GPT-4o, Claude, Gemini)",
      "Advanced canvas + design bank",
      "Full content calendar",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Team",
    price: "$79",
    period: "per month",
    description: "For agencies and teams managing multiple brands.",
    features: [
      "Everything in Pro",
      "Unlimited social accounts",
      "Team collaboration",
      "Brand workspaces",
      "White-label exports",
      "API access",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

export function L2PricingSection() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-indigo-500"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] text-neutral-900 sm:text-[44px]"
          >
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              pricing
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-[17px] text-neutral-500"
          >
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </motion.p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={revealUp}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                plan.highlight
                  ? "border-indigo-200 bg-gradient-to-b from-indigo-50 to-white shadow-lg shadow-indigo-100/60"
                  : "border-neutral-100 bg-white shadow-sm"
              }`}
            >
              {/* Popular badge */}
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Chip
                    size="sm"
                    variant="primary"
                    className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-3 text-[11px] font-semibold text-white shadow-md"
                  >
                    Most Popular
                  </Chip>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-5">
                <div className="mb-1 text-[15px] font-semibold text-neutral-900">
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[40px] font-bold tracking-tight text-neutral-900">
                    {plan.price}
                  </span>
                  <span className="text-[14px] text-neutral-500">
                    /{plan.period}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-neutral-500">
                  {plan.description}
                </p>
              </div>

              {/* Divider */}
              <div className="mb-5 h-px bg-neutral-100" />

              {/* Features */}
              <ul className="mb-7 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full ${
                        plan.highlight ? "bg-indigo-100" : "bg-neutral-100"
                      }`}
                    >
                      <Check
                        size={10}
                        className={
                          plan.highlight
                            ? "text-indigo-600"
                            : "text-neutral-500"
                        }
                      />
                    </div>
                    <span className="text-[14px] text-neutral-600">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a href="/login">
                <Button
                  size="md"
                  className={`w-full rounded-xl font-semibold ${
                    plan.highlight
                      ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200/60 transition-opacity hover:opacity-90"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                  variant={plan.highlight ? "primary" : "outline"}
                >
                  {plan.cta}
                </Button>
              </a>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust note */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 text-center text-[13px] text-neutral-400"
        >
          No credit card required · 14-day free trial on Pro · Cancel anytime
        </motion.p>
      </div>
    </section>
  );
}
