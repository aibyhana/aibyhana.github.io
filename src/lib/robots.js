// robots.txt: the file crawlers read before they read the site. It says who is asked to stay out.
// It is a request. The large AI companies follow it for the crawlers they name, and nothing forces a crawler to.
// The two switches are in Settings, under Pages. The names were checked against the companies' own pages in November 2026.

// crawlers that collect text to train AI models. Google-Extended and Applebot-Extended are not crawlers of their own:
// they tell Google and Apple not to use for training what their search crawlers have read.
export const TRAINING = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "meta-externalagent", "Amazonbot", "MistralAI-Training", "CCBot", "AI2Bot", "Bytespider", "cohere-ai", "cohere-training-data-crawler"];
// crawlers that build the index an AI search answers from
export const SEARCH = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "meta-webindexer", "Amzn-SearchBot", "MistralAI-Index", "YouBot"];

export function robotsTxt(SITE) {
  const keep = Object.assign({ training: true, search: true }, (SITE || {}).keepOut);
  const group = (why, names) => "# " + why + "\n" + names.map(n => "User-agent: " + n).join("\n") + "\nDisallow: /\n\n";
  return "# Who may read this site.\n# People, search engines, and assistants that open a page because a person asked for it are welcome.\n\n" +
    (keep.training ? group("Crawlers that collect text to train AI models: please stay out.", TRAINING) : "") +
    (keep.search ? group("Crawlers that build an index for AI search: please stay out.", SEARCH) : "") +
    "User-agent: *\nAllow: /\n";
}
