# OwnerSpec MCP Server

The official [Model Context Protocol](https://modelcontextprotocol.io) server for
[OwnerSpec.com](https://ownerspec.com), an independent, numbers-first reference for the
equipment people own and maintain at home. First vertical: home water treatment (softeners,
sediment and carbon filters, reverse osmosis, UV, iron, hardness, sulfur smell, well water
testing). Every figure on the site is cited to EPA, NSF/ANSI, WQA, a state extension service
or the manufacturer's own document, and every page carries the date its facts were verified.

**Live endpoint:** `https://ownerspec.com/mcp`

Stateless Streamable HTTP transport (JSON-RPC 2.0 over POST), no authentication, no
sessions. Any MCP client can connect and start calling tools immediately.

## Connect

**Claude Code**

```bash
claude mcp add --transport http ownerspec https://ownerspec.com/mcp
```

**Claude.ai / Claude Desktop:** Settings, Connectors, Add custom connector,
`https://ownerspec.com/mcp`, no authentication.

**ChatGPT:** Settings, Connectors, Advanced, Developer mode, then add
`https://ownerspec.com/mcp` as an MCP connector (no auth).

**MCP Inspector**

```bash
npx @modelcontextprotocol/inspector https://ownerspec.com/mcp
```

## Tools

| Tool | What it does |
| --- | --- |
| `search_pages` | Full-text search over every page, filterable by layer (guides, calculators, parts, reviews) and topic |
| `get_page` | Fetch one page as clean Markdown with canonical URL, dates and sources |
| `get_quick_answer` | The page's cited 134 to 167 word quick answer, verified date, FAQ and source list: the passage to quote |
| `diagnose_water_problem` | Symptom or lab result in, the matching diagnosis guides and their quick answers out |
| `find_replacement_part` | Model or part number in, the cartridges, lamps or parts that fit out, with product links |
| `get_product_picks` | The picks from the review and parts pages that match a need, with Amazon product links |
| `convert_water_hardness` | gpg, mg/L, dH, fH, Clark and mmol/L, with the USGS band |
| `size_water_softener` | Grain capacity between regenerations, nearest nominal size and the salt-efficient Fleck 5600SXT row |

Every answer ends with the URL to cite and the facts-verified date. The two calculator tools
use the same constants as the calculator pages on the site, and the site's build fails if
either side drifts.

The server also exposes resources (`llms.txt`, `llms-full.txt`, the sitemap, the search
index, the OpenAPI description, `auth.md`) and one prompt, `answer_from_ownerspec`.

## A2A agent

`functions/a2a.js` is a minimal [A2A](https://a2a-protocol.org) agent at
`https://ownerspec.com/a2a`: a question in a `SendMessage` (or `message/send`) call, a
completed task out whose artifact holds the matching pages, quick answers and URLs to cite.
Card: `https://ownerspec.com/.well-known/agent-card.json`.

## Markdown for agents

The whole site is agent-readable, not just this server:

- Any page returns Markdown when requested with `Accept: text/markdown`, or at its URL plus
  `index.md`.
- Discovery files: [`/.well-known/mcp/server-card.json`](https://ownerspec.com/.well-known/mcp/server-card.json),
  [`/llms.txt`](https://ownerspec.com/llms.txt),
  [`/.well-known/agent-skills/index.json`](https://ownerspec.com/.well-known/agent-skills/index.json),
  [`/.well-known/api-catalog`](https://ownerspec.com/.well-known/api-catalog),
  [`/.well-known/ard.json`](https://ownerspec.com/.well-known/ard.json),
  [`/openapi.json`](https://ownerspec.com/openapi.json),
  [`/auth.md`](https://ownerspec.com/auth.md).
- Human documentation: [ownerspec.com/mcp-server](https://ownerspec.com/mcp-server/).

## Transparency

OwnerSpec is an affiliate-funded site. Product links returned by `find_replacement_part` and
`get_product_picks` are Amazon Associates links; every response that carries one ships a
`disclosure` field saying so, and the tool descriptions say it plainly. Editorial content is
free to read, with no paywall and no auth. The site makes no medical claims and neither do
the tools: contaminant figures are quoted as EPA, WHO or state limits.

## Self-hosting

This is a Cloudflare Pages Function (`functions/mcp.js`, `functions/a2a.js`, shared code in
`functions/_lib/corpus.js`). To run your own instance:

1. Deploy the `functions/` directory with a Cloudflare Pages project in front of a static site.
2. The server reads its content live from the site it fronts: a build that emits `/index.json`
   (one record per page: title, url, layer, topic, dates, quick answer, FAQ, sources, picks,
   text) and a Markdown twin at `<page>/index.md`. Point the `SITE` constant at your deployment.
3. Replace the calculator constants in `mcp.js` with the ones printed on your own pages, or
   remove those two tools.

This repository mirrors the production functions. Keep them in sync with your own site
config if you fork it.

## License

[MIT](LICENSE)
