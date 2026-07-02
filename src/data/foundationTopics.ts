// Presentation metadata for foundation topics: a cover image and a short
// tagline, keyed by the topic slug the sync script derives from each entry's
// `topic` field (e.g. "Networking" -> "networking").
//
// Images live in /public and are referenced without the base prefix; the index
// page adds it. To change a topic's cover, drop a new file in
// public/foundations/ and point `image` at it (svg or png both work). Topics
// with no entry here fall back to a generated placeholder tile.
export interface TopicMeta {
  image?: string;
  tagline?: string;
}

export const foundationTopics: Record<string, TopicMeta> = {
  networking: {
    image: "foundations/networking.svg",
    tagline:
      "How data moves across a network, from cables and bits up to HTTP.",
  },
  "threat-modeling": {
    image: "foundations/threat-modeling.svg",
    tagline: "Find and prioritize security risks before attackers do.",
  },
};
