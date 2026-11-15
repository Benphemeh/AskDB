CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL
);
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity INTEGER NOT NULL,
  ordered_at TEXT NOT NULL
);
INSERT INTO customers VALUES (1, 'Ada', 'UK'), (2, 'Grace', 'US'), (3, 'Linus', 'FI'), (4, 'Margaret', 'US');
INSERT INTO products VALUES (1, 'Keyboard', 'hardware', 49.99), (2, 'Monitor', 'hardware', 199.00), (3, 'IDE license', 'software', 89.00);
INSERT INTO orders VALUES
  (1, 1, 1, 1, '2026-01-05'), (2, 1, 3, 1, '2026-01-06'), (3, 2, 2, 2, '2026-02-10'),
  (4, 3, 1, 1, '2026-03-01'), (5, 4, 2, 1, '2026-04-20'), (6, 4, 3, 2, '2026-04-21');
