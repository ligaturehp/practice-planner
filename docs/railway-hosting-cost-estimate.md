# Railway Hosting Cost Estimate

Date: 2026-05-24

## Current App Shape

Practice Planner's web deployment is documented as:

- Angular frontend service on Railway.
- Go backend API service on Railway.
- Railway PostgreSQL database.

The current production frontend build is small: about 312 KB in `frontend/dist`. This makes idle service cost a larger early driver than bandwidth.

## Railway Pricing Inputs

Current Railway pricing checked on 2026-05-24:

- Hobby subscription: $5/month, including $5/month of resource usage.
- Pro subscription: $20/month, including $20/month of resource usage.
- RAM: $10/GB-month.
- CPU: $20/vCPU-month.
- Network egress: $0.05/GB.
- Volume storage: $0.15/GB-month.

Railway charges for outbound network traffic. Ingress volume should still be estimated for capacity and abuse monitoring, but it is not the main billed network line item in this model.

Sources:

- Railway pricing plans: https://docs.railway.com/pricing/plans
- Railway bill explanation: https://docs.railway.com/pricing/understanding-your-bill
- Railway cost controls: https://docs.railway.com/pricing/cost-control

## Operating Assumptions

Baseline always-on footprint:

| Component | Assumed Average Usage | Monthly Cost |
| --- | ---: | ---: |
| Frontend static Node service | 0.10 GB RAM, 0.005 vCPU | $1.10 |
| Go API service | 0.06 GB RAM, 0.010 vCPU | $0.80 |
| PostgreSQL | 0.25 GB RAM, 0.010 vCPU | $2.70 |
| Database volume | 1 GB | $0.15 |
| **Baseline before user traffic** |  | **$4.75** |

Traffic model per active paying user per month:

| Usage Style | Ingress/User | Egress/User | Notes |
| --- | ---: | ---: | --- |
| Light | 1 MB | 3 MB | Occasional planning, browser caching works well. |
| Moderate | 3 MB | 10 MB | Several weekly planning sessions and save/load actions. |
| Heavy | 8 MB | 25 MB | Frequent planning, repeated devices, larger plan JSON over time. |

For the growth table below, the estimate uses the moderate traffic model and adds a small CPU allowance as usage grows.

## Growth Projection

| Paying Users | Est. Ingress | Est. Egress | Egress Cost | Est. Total Railway Bill, Hobby | Host Cost/User |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 0.15 GB | 0.5 GB | $0.03 | $5.00 | $0.100 |
| 250 | 0.75 GB | 2.5 GB | $0.13 | $5.00 | $0.020 |
| 1,000 | 3 GB | 10 GB | $0.50 | $5.55 | $0.006 |
| 5,000 | 15 GB | 50 GB | $2.50 | $8.25 | $0.002 |
| 10,000 | 30 GB | 100 GB | $5.00 | $12.25 | $0.001 |

Interpretation:

- Hobby should be enough for early validation if traffic is modest and there are no memory leaks.
- The app can likely support meaningful early revenue before hosting cost becomes material.
- The most likely surprise bill is not normal user bandwidth; it is service memory, unnecessary preview environments, public database connections, or accidental large files.

## Subscription Margin

Gross margin here means subscription revenue minus Railway hosting only. It excludes Stripe fees, taxes, support time, email, analytics, domains, refunds, and app store costs.

| Paying Users | Railway Bill | Revenue at $5/mo | Margin at $5 | Revenue at $10/mo | Margin at $10 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | $5.00 | $250 | 98.0% | $500 | 99.0% |
| 250 | $5.00 | $1,250 | 99.6% | $2,500 | 99.8% |
| 1,000 | $5.55 | $5,000 | 99.9% | $10,000 | 99.9% |
| 5,000 | $8.25 | $25,000 | 100.0% | $50,000 | 100.0% |
| 10,000 | $12.25 | $50,000 | 100.0% | $100,000 | 100.0% |

The rounded percentage can make larger rows look like 100.0%; the actual host cost is still nonzero, just extremely small relative to subscription revenue.

## Sensitivity Check

Heavy-use bandwidth at 10,000 users:

- Ingress: about 80 GB/month.
- Egress: about 250 GB/month.
- Egress cost: about $12.50/month.
- Estimated Railway bill with the same baseline and CPU allowance: about $19.75/month.

This still supports high gross margin at $5-$10/month. If the app later adds video, image uploads, PDF generation, file attachments, or public sharing pages, this estimate should be redone because bandwidth and storage could become first-order costs.

## Cost Controls

- Use Railway private networking for backend-to-Postgres traffic through `DATABASE_URL`, not public database URLs.
- Set usage alerts and a hard spending limit during beta.
- Disable PR deploys unless actively needed.
- Avoid running duplicate staging environments continuously.
- Keep the frontend static bundle cacheable.
- Consider moving the frontend to GitHub Pages or Cloudflare Pages later if the Railway frontend service's idle memory becomes wasteful.
- Measure a real one-week beta and replace this estimate with Railway usage data before making pricing commitments.

## Pricing Judgment

At $5/month, the product has plenty of hosting margin if the value proposition is strong enough and support load stays low. At $10/month, there is more room for payment processing, support, onboarding, and product development. Hosting cost alone does not force a $10 price; customer willingness to pay and operational burden should drive that decision.
