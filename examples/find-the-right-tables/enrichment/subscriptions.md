---
id: 'table:public.subscriptions'
name: subscriptions
schemaId: askdb
columns:
  - id: 'table:public.subscriptions#status'
    enum:
      - A
      - T
      - P
      - C
    description: >-
      Subscription state, as a one-letter code: A = active, T = trial, P = past
      due, C = cancelled.
---
# Table: subscriptions

## Common query language

- An active subscription has status A or P (past due still counts), started_at on or before today, and ended_at NULL or after today. A trial (T) is not active.
