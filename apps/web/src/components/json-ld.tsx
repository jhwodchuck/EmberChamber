import React from "react";

interface JsonLdProps {
  json: Record<string, any>;
}

export function JsonLd({ json }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
