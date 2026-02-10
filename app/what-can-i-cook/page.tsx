import { WhatCanICookClient } from "./ClientView";

export default function WhatCanICookPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold tracking-tight">
        What can I cook?
      </h2>
      <WhatCanICookClient />
    </section>
  );
}

