CREATE DATABASE ecommerce;

-- Depois de conectar no banco ecommerce:

CREATE TABLE products (
    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    price INTEGER NOT NULL CHECK (price >= 0),

    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),

    image_url TEXT,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE orders (
    id SERIAL PRIMARY KEY,

    customer_name VARCHAR(150) NOT NULL,

    customer_email VARCHAR(255) NOT NULL,

    total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    stripe_session_id VARCHAR(255) UNIQUE,

    stripe_payment_intent_id VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,

    order_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,

    product_name VARCHAR(150) NOT NULL,

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    price INTEGER NOT NULL CHECK (price >= 0),

    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
);


CREATE INDEX idx_products_active
ON products(active);


CREATE INDEX idx_orders_email
ON orders(customer_email);


CREATE INDEX idx_orders_status
ON orders(status);


CREATE INDEX idx_order_items_order_id
ON order_items(order_id);


INSERT INTO products
(name, description, price, stock, image_url)
VALUES
(
    'Teclado Mecânico',
    'Teclado mecânico RGB',
    19990,
    10,
    '/images/teclado.jpg'
),
(
    'Mouse Gamer',
    'Mouse gamer 12000 DPI',
    9990,
    20,
    '/images/mouse.jpg'
),
(
    'Headset Gamer',
    'Headset com microfone',
    14990,
    15,
    '/images/headset.jpg'
);