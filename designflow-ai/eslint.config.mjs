import nextPlugin from "eslint-config-next";
import boundaries from "eslint-plugin-boundaries";

/**
 * Enforces the dependency direction from the architecture doc §6:
 * components → actions/hooks only
 * actions     → services only
 * services    → db/repositories + ai + integrations
 * nothing reaches into integrations/ except services/
 */
const config = [
  ...nextPlugin,
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "components", pattern: "src/components/*" },
        { type: "actions", pattern: "src/actions/*" },
        { type: "services", pattern: "src/services/*" },
        { type: "ai", pattern: "src/ai/*" },
        { type: "integrations", pattern: "src/integrations/*" },
        { type: "db", pattern: "src/db/*" },
        { type: "app", pattern: "src/app/*" },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            { from: "components", disallow: ["integrations", "db"] },
            { from: "actions", disallow: ["integrations", "db"] },
            { from: "integrations", disallow: ["components", "actions", "app"] },
          ],
        },
      ],
    },
  },
];

export default config;
