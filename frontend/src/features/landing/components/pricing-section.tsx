"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { ease, fadeScale, staggerContainer } from "../lib/animations";

const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "/month",
    description: "For individuals getting started.",
    features: [
      "3 projects",
      "1 AI model (GPT-4o)",
      "10 published posts/month",
      "Visual canvas + code editor",
      "PNG/JPEG export",
    ],
    cta: "Get started free",
    href: "/login",
    highlighted: false,
    bg: "#ffffff",
  },
  {
    name: "Pro",
    price: "29",
    period: "/month",
    description: "For creators who ship at scale.",
    features: [
      "Unlimited projects",
      "All 3 AI models",
      "Unlimited published posts",
      "Team approval workflow",
      "Analytics dashboard",
      "Custom skills & templates",
      "Priority support",
    ],
    cta: "Start Pro trial",
    href: "/login?plan=pro",
    highlighted: true,
    badge: "Most popular",
    bg: "#FFD23F",
  },
  {
    name: "Team",
    price: "79",
    period: "/month",
    description: "For teams that need more control.",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Role-based permissions",
      "Audit trail",
      "SSO (SAML)",
      "Custom integrations",
      "Dedicated onboarding",
    ],
    cta: "Contact sales",
    href: "/login?plan=team",
    highlighted: false,
    bg: "#ffffff",
  },
] as const;

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="py-24 sm:py-32 bg-brutal-pastel-blue border-b-2 border-black"
    >
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease }}
          className="text-center"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-black font-bold mb-2">
            Pricing
          </p>
          <h2 className="font-display font-extrabold text-[40px] sm:text-[56px] lg:text-[64px] leading-[1] tracking-[-0.04em] text-black">
            Simple, <span className="text-[#555]">transparent pricing.</span>
          </h2>
          <p className="mt-4 text-base text-[#555] max-w-md mx-auto leading-relaxed font-medium">
            No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeScale}
              className={plan.highlighted ? "md:scale-[1.04] z-10" : ""}
              whileHover={{ x: -2, y: -2 }}
              whileTap={{ x: 2, y: 2 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="relative h-full p-6 flex flex-col rounded-lg"
                style={{
                  background: plan.bg,
                  border: plan.highlighted
                    ? "3px solid #000"
                    : "2px solid #000",
                  boxShadow: plan.highlighted
                    ? "8px 8px 0 0 #000"
                    : "5px 5px 0 0 #000",
                }}
              >
                {plan.highlighted && "badge" in plan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded border-2 border-black bg-brutal-coral text-white font-bold px-3 py-1 text-[11px] uppercase tracking-wider shadow-brutal-sm">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-black uppercase tracking-wider">
                    {plan.name}
                  </p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="font-display font-extrabold text-[48px] leading-none tracking-tight text-black">
                      ${plan.price}
                    </span>
                    <span className="text-sm text-[#555] mb-2 font-medium">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#555] font-medium">
                    {plan.description}
                  </p>
                </div>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-black mt-0.5 shrink-0" />
                      <span className="text-sm text-black font-medium">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <motion.a
                  href={plan.href}
                  className="mt-8 brutal-btn rounded-lg w-full h-10 text-sm justify-center"
                  style={{
                    background: plan.highlighted ? "#000" : "#fff",
                    color: plan.highlighted ? "#fff" : "#000",
                  }}
                  whileHover={{ x: -2, y: -2 }}
                  whileTap={{ x: 2, y: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  {plan.cta}
                </motion.a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
