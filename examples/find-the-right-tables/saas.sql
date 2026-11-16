-- A made-up SaaS business: 63 tables, for the AskDB tutorial "Find the right tables in a large schema".
-- Only customers, plans and subscriptions have rows.

CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, country TEXT, created_at TEXT);
CREATE TABLE accounts (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), name TEXT);
CREATE TABLE users (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), email TEXT, role TEXT);
CREATE TABLE teams (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), name TEXT);
CREATE TABLE team_members (id INTEGER PRIMARY KEY, team_id INTEGER REFERENCES teams(id), user_id INTEGER REFERENCES users(id));
CREATE TABLE invitations (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), email TEXT, sent_at TEXT);
CREATE TABLE plans (id INTEGER PRIMARY KEY, name TEXT, monthly_price NUMERIC);
CREATE TABLE plan_features (id INTEGER PRIMARY KEY, plan_id INTEGER REFERENCES plans(id), feature TEXT);
CREATE TABLE subscriptions (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), plan_id INTEGER REFERENCES plans(id), status TEXT, started_at TEXT, ended_at TEXT);
CREATE TABLE subscription_items (id INTEGER PRIMARY KEY, subscription_id INTEGER REFERENCES subscriptions(id), quantity INTEGER);
CREATE TABLE subscription_events (id INTEGER PRIMARY KEY, subscription_id INTEGER REFERENCES subscriptions(id), kind TEXT, at TEXT);
CREATE TABLE trials (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), started_at TEXT, ends_at TEXT);
CREATE TABLE coupons (id INTEGER PRIMARY KEY, code TEXT, percent_off NUMERIC);
CREATE TABLE coupon_redemptions (id INTEGER PRIMARY KEY, coupon_id INTEGER REFERENCES coupons(id), customer_id INTEGER REFERENCES customers(id));
CREATE TABLE invoices (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), total NUMERIC, issued_at TEXT, status TEXT);
CREATE TABLE invoice_lines (id INTEGER PRIMARY KEY, invoice_id INTEGER REFERENCES invoices(id), amount NUMERIC, description TEXT);
CREATE TABLE payments (id INTEGER PRIMARY KEY, invoice_id INTEGER REFERENCES invoices(id), amount NUMERIC, paid_at TEXT);
CREATE TABLE payment_methods (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), brand TEXT, last4 TEXT);
CREATE TABLE refunds (id INTEGER PRIMARY KEY, payment_id INTEGER REFERENCES payments(id), amount NUMERIC, at TEXT);
CREATE TABLE credit_notes (id INTEGER PRIMARY KEY, invoice_id INTEGER REFERENCES invoices(id), amount NUMERIC);
CREATE TABLE tax_rates (id INTEGER PRIMARY KEY, country TEXT, rate NUMERIC);
CREATE TABLE currencies (id INTEGER PRIMARY KEY, code TEXT, name TEXT);
CREATE TABLE exchange_rates (id INTEGER PRIMARY KEY, currency_id INTEGER REFERENCES currencies(id), rate NUMERIC, on_date TEXT);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price NUMERIC, category_id INTEGER REFERENCES categories(id));
CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE product_variants (id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(id), sku TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), ordered_at TEXT, status TEXT);
CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id), quantity INTEGER);
CREATE TABLE carts (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), updated_at TEXT);
CREATE TABLE cart_items (id INTEGER PRIMARY KEY, cart_id INTEGER REFERENCES carts(id), product_id INTEGER REFERENCES products(id));
CREATE TABLE shipments (id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id), carrier TEXT, shipped_at TEXT);
CREATE TABLE shipment_events (id INTEGER PRIMARY KEY, shipment_id INTEGER REFERENCES shipments(id), status TEXT, at TEXT);
CREATE TABLE returns (id INTEGER PRIMARY KEY, order_id INTEGER REFERENCES orders(id), reason TEXT);
CREATE TABLE warehouses (id INTEGER PRIMARY KEY, name TEXT, country TEXT);
CREATE TABLE inventory (id INTEGER PRIMARY KEY, warehouse_id INTEGER REFERENCES warehouses(id), product_id INTEGER REFERENCES products(id), on_hand INTEGER);
CREATE TABLE suppliers (id INTEGER PRIMARY KEY, name TEXT, country TEXT);
CREATE TABLE purchase_orders (id INTEGER PRIMARY KEY, supplier_id INTEGER REFERENCES suppliers(id), ordered_at TEXT);
CREATE TABLE purchase_order_lines (id INTEGER PRIMARY KEY, purchase_order_id INTEGER REFERENCES purchase_orders(id), product_id INTEGER REFERENCES products(id), quantity INTEGER);
CREATE TABLE addresses (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), city TEXT, country TEXT);
CREATE TABLE contacts (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), name TEXT, phone TEXT);
CREATE TABLE leads (id INTEGER PRIMARY KEY, email TEXT, source TEXT, created_at TEXT);
CREATE TABLE campaigns (id INTEGER PRIMARY KEY, name TEXT, channel TEXT, started_at TEXT);
CREATE TABLE campaign_touches (id INTEGER PRIMARY KEY, campaign_id INTEGER REFERENCES campaigns(id), lead_id INTEGER REFERENCES leads(id));
CREATE TABLE opportunities (id INTEGER PRIMARY KEY, lead_id INTEGER REFERENCES leads(id), amount NUMERIC, stage TEXT);
CREATE TABLE sales_reps (id INTEGER PRIMARY KEY, name TEXT, region TEXT);
CREATE TABLE support_tickets (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), subject TEXT, opened_at TEXT, closed_at TEXT);
CREATE TABLE ticket_comments (id INTEGER PRIMARY KEY, ticket_id INTEGER REFERENCES support_tickets(id), body TEXT);
CREATE TABLE nps_responses (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), score INTEGER, at TEXT);
CREATE TABLE feature_flags (id INTEGER PRIMARY KEY, key TEXT, enabled INTEGER);
CREATE TABLE sessions (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), started_at TEXT);
CREATE TABLE page_views (id INTEGER PRIMARY KEY, session_id INTEGER REFERENCES sessions(id), path TEXT, at TEXT);
CREATE TABLE events (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), name TEXT, at TEXT);
CREATE TABLE api_keys (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), prefix TEXT, created_at TEXT);
CREATE TABLE api_requests (id INTEGER PRIMARY KEY, api_key_id INTEGER REFERENCES api_keys(id), path TEXT, at TEXT);
CREATE TABLE webhooks (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), url TEXT);
CREATE TABLE webhook_deliveries (id INTEGER PRIMARY KEY, webhook_id INTEGER REFERENCES webhooks(id), status INTEGER, at TEXT);
CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), action TEXT, at TEXT);
CREATE TABLE notifications (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), kind TEXT, sent_at TEXT);
CREATE TABLE email_messages (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), template TEXT, sent_at TEXT);
CREATE TABLE usage_records (id INTEGER PRIMARY KEY, subscription_id INTEGER REFERENCES subscriptions(id), units INTEGER, on_date TEXT);
CREATE TABLE projects (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), name TEXT);
CREATE TABLE project_members (id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES projects(id), user_id INTEGER REFERENCES users(id));
CREATE TABLE files (id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES projects(id), name TEXT, bytes INTEGER);

INSERT INTO customers VALUES (1, 'Ada Lovelace', 'GB', '2026-01-02'), (2, 'Grace Hopper', 'US', '2026-01-15'), (3, 'Alan Turing', 'GB', '2026-02-03'), (4, 'Edsger Dijkstra', 'NL', '2026-03-09');
INSERT INTO plans VALUES (1, 'Basic', 9.00), (2, 'Pro', 29.00);
INSERT INTO subscriptions VALUES
  (1, 1, 2, 'A', '2026-01-05', NULL),
  (2, 2, 1, 'C', '2026-02-10', '2026-05-10'),
  (3, 3, 2, 'T', '2026-10-28', NULL),
  (4, 4, 1, 'P', '2026-04-20', NULL),
  (5, 4, 2, 'A', '2099-01-01', NULL);
