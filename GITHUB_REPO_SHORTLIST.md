# GitHub Repo Shortlist

This is a practical shortlist of free or source-available GitHub repos that fit the current `ggmarketing.co.ke` stack and related projects.

## Highest Priority

### n8n

- Repo: `n8n-io/n8n`
- Link: <https://github.com/n8n-io/n8n>
- Why it fits:
  - Best next step for orchestrating forms, email, CRM, and follow-up workflows
  - Natural replacement for one-off webhook fanout once automations become more complex
  - Good fit for lead qualification, reminders, internal alerts, and report scheduling

### Chatwoot

- Repo: `chatwoot/chatwoot`
- Link: <https://github.com/chatwoot/chatwoot>
- Why it fits:
  - Gives you a proper support inbox for website chat, email, and messaging channels
  - Useful if you want a team inbox instead of handling inquiries from separate channels manually
  - Strong fit for lead handoff and customer support operations

### Umami

- Repo: `umami-software/umami`
- Link: <https://github.com/umami-software/umami>
- Why it fits:
  - Lightweight privacy-focused analytics for a marketing site
  - Good replacement or complement to heavier analytics setups
  - Useful for campaign landing pages, conversion tracking, and content performance

## Strong Second Wave

### Formbricks

- Repo: `formbricks/formbricks`
- Link: <https://github.com/formbricks/formbricks>
- Why it fits:
  - Useful for collecting on-site surveys, customer feedback, and post-service sentiment
  - Good match for G&G service feedback loops and Eazzy Rent tenant/product research
  - Can help improve offers, onboarding, and landing pages with real user insight

### Twenty

- Repo: `twentyhq/twenty`
- Link: <https://github.com/twentyhq/twenty>
- Why it fits:
  - Modern open CRM for managing leads, deals, and follow-ups
  - Strong candidate if you want to move beyond Sheets into a real pipeline
  - Good long-term home for website leads, proposals, and follow-up tracking

### NocoDB

- Repo: `nocodb/nocodb`
- Link: <https://github.com/nocodb/nocodb>
- Why it fits:
  - Strong middle ground between Google Sheets and a full CRM
  - Useful for internal lead tables, property inventory, campaign tracking, and lightweight ops apps
  - Easier for non-developers to work with than a custom admin panel

## Conditional Pick

### Appsmith

- Repo: `appsmithorg/appsmith`
- Link: <https://github.com/appsmithorg/appsmith>
- Why it fits:
  - Best if you want a custom internal dashboard on top of APIs, Sheets, or databases
  - Good for building an operator console for leads and admin workflows
  - Better choice than building every internal tool from scratch

## Not My First Pick Right Now

### Cal.diy

- Repo: `calcom/cal.com`
- Link: <https://github.com/calcom/cal.com>
- Why I would wait:
  - Scheduling is relevant, but your current consultation flow already works
  - The community edition is more self-hosting overhead than your current need justifies
  - I would only adopt it if consultation booking becomes a bigger operational bottleneck

## Suggested Adoption Order

1. `n8n`
2. `Umami`
3. `Chatwoot`
4. `Twenty` or `NocoDB`
5. `Formbricks`
6. `Appsmith`

## Best Fit By Use Case

### Lead Automation

- `n8n`
- `Twenty`
- `NocoDB`

### Support Inbox

- `Chatwoot`

### Analytics

- `Umami`

### Research And Feedback

- `Formbricks`

### Internal Ops Dashboard

- `Appsmith`
