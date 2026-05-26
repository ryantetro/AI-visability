# Email to Porter — Dealer Spike Tickets

**To:** Porter
**From:** Ryan
**Subject:** Dealer Spike tickets — AI search visibility updates for 3 sites

---

Hey Porter,

Quick favor — I need three Dealer Spike support tickets submitted so we can improve AI search visibility (ChatGPT, Claude, Perplexity, Gemini, Google AI Overview) across our sites. I've drafted everything Dealer Spike needs; you just need to forward each one along with its attachments. Could you cc me on the tickets so I can verify once they're done?

## Site 1: www.slcboats.com — 1 change

Replace the current robots.txt with the attached file (`slcboats-robots.txt`). The current robots.txt blocks all major AI search bots via Cloudflare's Managed Content feature. The replacement allows them.

**Attach:** `slcboats-robots.txt`

## Site 2: www.nautiqueboatsofutah.com — 1 change

Same change as Site 1 — replace robots.txt with the attached file. Same Cloudflare AI-bot blocking is in place that needs to be removed.

**Attach:** `nautiqueboatsofutah-robots.txt`

## Site 3: www.mastercraftutah.com — 2 changes (1 ticket)

Two related changes:

1. Install our dealer Google Tag Manager container `GTM-WBRVRFZX` *in addition to* (not replacing) the existing platform container `GTM-NP4S3KHX`. The exact snippet and where to install it is in the attached file. Both containers must keep loading on the page — this is a standard GTM dual-install.
2. Replace robots.txt with the attached file (same AI-bot unblock as the other two sites).

**Attach:** `mastercraftutah-gtm-install.txt` + `mastercraftutah-robots.txt`

---

## Suggested ticket subject lines

So Dealer Spike triages them quickly:

1. *"Update robots.txt for www.slcboats.com — disable Cloudflare AI bot blocking"*
2. *"Update robots.txt for www.nautiqueboatsofutah.com — disable Cloudflare AI bot blocking"*
3. *"Install GTM-WBRVRFZX + update robots.txt for www.mastercraftutah.com"*

---

## Prewritten ticket bodies (copy/paste into each ticket)

### Ticket 1 body — slcboats.com

> Hi team,
>
> We're improving AI search visibility (ChatGPT, Claude, Perplexity, Gemini, Google AI Overview) for www.slcboats.com.
>
> The site's current robots.txt explicitly disallows all major AI search bots via Cloudflare's Managed Content Signals: GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, OAI-SearchBot, CCBot, Applebot-Extended, Bytespider, Amazonbot, and meta-externalagent.
>
> Please either:
>
> **(a) Disable Cloudflare Managed Content Signals** for this site entirely, OR
>
> **(b) Replace the `Disallow: /` rules for the AI-bot user agents listed above with `Allow: /`** and change `Content-Signal: search=yes,ai-train=no` to `Content-Signal: search=yes,ai-input=yes,ai-train=yes`.
>
> Please preserve all other existing rules — the `User-agent: *` Allow, the `User-agent: bingbot` block, the legacy `.asp` Disallows, and the existing scraper blocks (Baiduspider, YandexBot, AhrefsBot, Ezooms, MJ12bot) should remain unchanged.
>
> The desired final robots.txt is attached.
>
> Please confirm when this is live so we can verify. Thanks!

### Ticket 2 body — nautiqueboatsofutah.com

> Hi team,
>
> We're improving AI search visibility (ChatGPT, Claude, Perplexity, Gemini, Google AI Overview) for www.nautiqueboatsofutah.com.
>
> The site's current robots.txt explicitly disallows all major AI search bots via Cloudflare's Managed Content Signals: GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, OAI-SearchBot, CCBot, Applebot-Extended, Bytespider, Amazonbot, and meta-externalagent.
>
> Please either:
>
> **(a) Disable Cloudflare Managed Content Signals** for this site entirely, OR
>
> **(b) Replace the `Disallow: /` rules for the AI-bot user agents listed above with `Allow: /`** and change `Content-Signal: search=yes,ai-train=no` to `Content-Signal: search=yes,ai-input=yes,ai-train=yes`.
>
> Please preserve all other existing rules — the `User-agent: *` Allow, the `User-agent: bingbot` block, the legacy `.asp` Disallows, and the existing scraper blocks (Baiduspider, YandexBot, AhrefsBot, Ezooms, MJ12bot) should remain unchanged.
>
> The desired final robots.txt is attached.
>
> Please confirm when this is live so we can verify. Thanks!

### Ticket 3 body — mastercraftutah.com

> Hi team,
>
> Two related changes for www.mastercraftutah.com please.
>
> **1. Install our dealer GTM container alongside the existing platform container.**
>
> The site currently loads `GTM-NP4S3KHX` (your platform-level container). We need our dealer-managed container `GTM-WBRVRFZX` installed **in addition to** the existing one, not replacing it. Both Google Tag Manager containers can coexist on the page — this is a standard dual-install.
>
> Please add the `GTM-WBRVRFZX` snippet to the `<head>` and the noscript fallback iframe to the top of `<body>` per Google's standard install instructions: https://developers.google.com/tag-platform/tag-manager/web
>
> Exact snippets to install are in the attached file `mastercraftutah-gtm-install.txt`.
>
> **2. Disable AI bot blocking in robots.txt.**
>
> We're improving AI search visibility (ChatGPT, Claude, Perplexity, Gemini, Google AI Overview). The current robots.txt explicitly disallows GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, OAI-SearchBot, CCBot, Applebot-Extended, Bytespider, Amazonbot, and meta-externalagent via Cloudflare's Managed Content Signals.
>
> Please either:
>
> - **(a)** Disable Cloudflare Managed Content Signals for this site entirely, OR
> - **(b)** Replace the `Disallow: /` rules for the AI-bot user agents above with `Allow: /` and change `Content-Signal: search=yes,ai-train=no` to `Content-Signal: search=yes,ai-input=yes,ai-train=yes`.
>
> Preserve all other existing rules unchanged — the `User-agent: *` Allow, bingbot block, `.asp` Disallows, and existing scraper blocks (Baiduspider, YandexBot, AhrefsBot, Ezooms, MJ12bot).
>
> The desired final robots.txt is in the attached file `mastercraftutah-robots.txt`.
>
> Please confirm when both changes are live so we can verify. Thanks!

---

## Attachment files (all in this folder)

| File | Goes with |
|------|-----------|
| `slcboats-robots.txt` | Ticket 1 |
| `nautiqueboatsofutah-robots.txt` | Ticket 2 |
| `mastercraftutah-robots.txt` | Ticket 3 |
| `mastercraftutah-gtm-install.txt` | Ticket 3 |

Thanks!
Ryan
