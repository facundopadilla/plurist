import { Sparkles } from "lucide-react";

const links = {
  Product: ["Features", "Pricing", "Changelog", "Roadmap"],
  Company: ["About", "Blog", "Careers", "Press"],
  Resources: ["Documentation", "API", "Integrations", "Status"],
  Legal: ["Privacy", "Terms", "Security", "Cookies"],
};

export function L2Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/landing2" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-[17px] font-bold tracking-tight text-neutral-900">
                Plurist
              </span>
            </a>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              AI-powered social media creation and scheduling for modern teams.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                {category}
              </p>
              <ul className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-[13px] text-neutral-500 transition-colors hover:text-neutral-900"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-100 pt-8 sm:flex-row">
          <p className="text-[13px] text-neutral-400">
            © {new Date().getFullYear()} Plurist. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {["Twitter", "LinkedIn", "GitHub"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-[13px] font-medium text-neutral-400 transition-colors hover:text-neutral-700"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
