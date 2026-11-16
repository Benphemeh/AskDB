---
id: 'table:public.plans'
name: plans
schemaId: askdb
aliases: [subscription plans, pricing plans, pricing tiers]
columns:
  - id: 'table:public.plans#monthly_price'
    description: The plan's price per month, in US dollars.
---
# Table: plans

The subscription plans a customer can be on, with each plan's monthly price. Every subscription points to one plan through subscriptions.plan_id.

## Business context

- Monthly recurring revenue (MRR) is the sum of plans.monthly_price over active subscriptions, joined through subscriptions.plan_id.
