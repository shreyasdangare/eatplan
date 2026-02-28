import { WhatCanICookClient } from "./ClientView";

export default function WhatCanICookPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        What can I cook?
      </h2>
      <WhatCanICookClient />
    </section>
  );
}

