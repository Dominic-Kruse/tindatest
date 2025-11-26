// db/schema.ts
import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  text,
  timestamp,
  pgEnum,
  decimal,
  index,
} from 'drizzle-orm/pg-core';






import { sql,relations } from 'drizzle-orm'
/**
 * Enums
 */
export const userRoleEnum = pgEnum('user_role', ['vendor', 'buyer']);

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'image',
  'order_inquiry',
  'price_negotiation',
  'delivery_question',
  'product_question',
  'complaint',
  'review',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]);

/**
 * Users
 */
export const users = pgTable('users', {
  user_id: serial('user_id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('buyer').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Vendors (one-to-one with users)
 */
export const vendors = pgTable('vendors', {
  user_id: integer('user_id')
    .primaryKey()
    .references(() => users.user_id, { onDelete: 'cascade' }),
  business_name: varchar('business_name', { length: 255 }),
  vendor_contact: varchar('vendor_contact', { length: 255 }),
  vendor_description: text('vendor_description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Buyers (one-to-one with users)
 */
export const buyers = pgTable('buyers', {
  user_id: integer('user_id')
    .primaryKey()
    .references(() => users.user_id, { onDelete: 'cascade' }),
  buyer_description: text('buyer_description'),
  buyer_latitude: decimal('buyer_latitude', { precision: 9, scale: 6 }),
  buyer_longitude: decimal('buyer_longitude', { precision: 9, scale: 6 }),
  buyer_address: text('buyer_address'),
  buyer_city: varchar('buyer_city', { length: 100 }),
  buyer_state: varchar('buyer_state', { length: 100 }),
  buyer_zip_code: varchar('buyer_zip_code', { length: 20 }),
  buyer_country: varchar('buyer_country', { length: 100 }).default('Philippines'),
  suki_count: integer('suki_count').default(0),
  suki_rank: varchar('suki_rank', { length: 50 }).default('bronze'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const stallStatusEnum = pgEnum('stall_status', ['active', 'inactive', 'pending']);

/**
 * Stalls
 */
export const stalls = pgTable('stalls', {
  stall_id: serial('stall_id').primaryKey(),
  user_id: integer('user_id').references(() => vendors.user_id, { onDelete: 'cascade' }),
  stall_name: varchar('stall_name', { length: 100 }).notNull(),
  stall_description: text('stall_description'),
  category: varchar('category', { length: 100 }).notNull(),
  stall_latitude: decimal('stall_latitude', { precision: 9, scale: 6 }),
  stall_longitude: decimal('stall_longitude', { precision: 9, scale: 6 }),
  stall_address: text('stall_address'),
  stall_city: varchar('stall_city', { length: 100 }),
  stall_state: varchar('stall_state', { length: 100 }),
  stall_zip_code: varchar('stall_zip_code', { length: 20 }),
  stall_country: varchar('stall_country', { length: 100 }).default('Philippines'),
  status: stallStatusEnum('status').default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Stall items (products)
 * - indexed on stall_id and price for common listing/filtering
 */
export const stall_items = pgTable(
  'stall_items',
  {
    item_id: serial('item_id').primaryKey(),
    stall_id: integer('stall_id').references(() => stalls.stall_id, { onDelete: 'cascade' }),
    item_name: varchar('item_name', { length: 250 }).notNull(),
    item_description: text('item_description'),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    item_stocks: integer('item_stocks').default(0),
    in_stock: boolean('in_stock').default(false),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    stallIdIndex: index('stall_items_stall_id_idx').on(table.stall_id),
    priceIndex: index('stall_items_price_idx').on(table.price),
  })
);

/**
 * Conversations (buyer <-> vendor for a stall)
 * - composite index for quick buyer-vendor lookup
 */
export const conversations = pgTable(
  'conversations',
  {
    conversation_id: serial('conversation_id').primaryKey(),
    buyer_id: integer('buyer_id').references(() => buyers.user_id, { onDelete: 'cascade' }).notNull(),
    vendor_id: integer('vendor_id').references(() => vendors.user_id, { onDelete: 'cascade' }).notNull(),
    stall_id: integer('stall_id').references(() => stalls.stall_id, { onDelete: 'cascade' }).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    last_message_at: timestamp('last_message_at').defaultNow().notNull(),
    is_active: boolean('is_active').default(true),
  },
  (table) => ({
    buyerVendorIndex: index('conversations_buyer_vendor_idx').on(table.buyer_id, table.vendor_id),
  })
);

/**
 * Messages
 * - index on conversation_id for fast message retrieval
 */
export const messages = pgTable(
  'messages',
  {
    message_id: serial('message_id').primaryKey(),
    conversation_id: integer('conversation_id').references(() => conversations.conversation_id, { onDelete: 'cascade' }).notNull(),
    sender_user_id: integer('sender_user_id').references(() => users.user_id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    message_type: messageTypeEnum('message_type').default('text').notNull(),
    is_read: boolean('is_read').default(false).notNull(),
    sent_at: timestamp('sent_at').defaultNow().notNull(),
    edited_at: timestamp('edited_at'),
  },
  (table) => ({
    conversationIndex: index('messages_conversation_idx').on(table.conversation_id),
  })
);

/**
 * Images
 * - generic image table for multiple entity types (stall, item, user, message, etc.)
 * - references are nullable so same row can point to only the relevant entity
 */
export const images = pgTable('images', {
  image_id: serial('image_id').primaryKey(),
  image_url: varchar('image_url', { length: 1024 }).notNull(),
  entity_type: varchar('entity_type', { length: 50 }).notNull(), // e.g., 'stall', 'item', 'user', 'message'
  image_type: varchar('image_type', { length: 50 }).notNull(), // e.g., 'thumbnail', 'gallery', 'avatar'
  user_id: integer('user_id').references(() => users.user_id, { onDelete: 'set null' }),
  stall_id: integer('stall_id').references(() => stalls.stall_id, { onDelete: 'set null' }),
  item_id: integer('item_id').references(() => stall_items.item_id, { onDelete: 'set null' }),
  message_id: integer('message_id').references(() => messages.message_id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// revoked tokens 

export const revoked_tokens = pgTable('revoked_tokens', {
  token_id: serial('token_id').primaryKey(),
  jwt_token: text('jwt_token').notNull().unique(),
  revoked_at: timestamp('revoked_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at').notNull(),
});

/**
 * Reviews
 */
export const reviews = pgTable('reviews', {
  review_id: serial('review_id').primaryKey(),
  buyer_id: integer('buyer_id').references(() => buyers.user_id, { onDelete: 'cascade' }),
  stall_id: integer('stall_id').references(() => stalls.stall_id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull().default(5),
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Shopping carts and line items
 */
export const shopping_carts = pgTable('shopping_carts', {
  cart_id: serial('cart_id').primaryKey(),
  buyer_id: integer('buyer_id').references(() => buyers.user_id, { onDelete: 'cascade' }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const line_items = pgTable('line_items', {
  line_item_id: serial('line_item_id').primaryKey(),
  cart_id: integer('cart_id').references(() => shopping_carts.cart_id, { onDelete: 'cascade' }),
  order_id: integer('order_id').references(() => orders.order_id), // nullable until order created
  item_id: integer('item_id').references(() => stall_items.item_id, { onDelete: 'cascade' }),
  quantity: integer('quantity').default(1).notNull(),
  unit_price: decimal('unit_price', { precision: 12, scale: 2 }).notNull(), // snapshot price
  created_at: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Orders
 * - orderStatusEnum
 * - index for buyer+stall lookups
 */
export const orders = pgTable(
  'orders',
  {
    order_id: serial('order_id').primaryKey(),
    buyer_id: integer('buyer_id').references(() => buyers.user_id, { onDelete: 'cascade' }).notNull(),
    stall_id: integer('stall_id').references(() => stalls.stall_id, { onDelete: 'cascade' }).notNull(),
    status: orderStatusEnum('status').default('pending').notNull(),
    total_amount: decimal('total_amount', { precision: 14, scale: 2 }).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    buyerStallIndex: index('orders_buyer_stall_idx').on(table.buyer_id, table.stall_id),
    statusIndex: index('orders_status_idx').on(table.status),
  })
);

/**
 * Payments
 */
export const payments = pgTable('payments', {
  payment_id: serial('payment_id').primaryKey(),
  order_id: integer('order_id').references(() => orders.order_id, { onDelete: 'set null' }),
  payer_buyer_id: integer('payer_buyer_id').references(() => buyers.user_id, { onDelete: 'set null' }),
  stall_id: integer('stall_id').references(() => stalls.stall_id, { onDelete: 'set null' }),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  method: varchar('method', { length: 100 }).notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  external_ref: varchar('external_ref', { length: 255 }), // optional external payment provider id
});

/**
 * Sales (analytics / record of completed sales)
 * - references payment and order
 */
export const sales = pgTable(
  'sales',
  {
    sale_id: serial('sale_id').primaryKey(),
    order_id: integer('order_id').references(() => orders.order_id, { onDelete: 'set null' }),
    payment_id: integer('payment_id').references(() => payments.payment_id, { onDelete: 'set null' }),
    stall_id: integer('stall_id').references(() => stalls.stall_id, { onDelete: 'set null' }).notNull(),
    total_amount: decimal('total_amount', { precision: 14, scale: 2 }).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    stallDateIndex: index('sales_stall_date_idx').on(table.stall_id, table.created_at),
  })
);


// relations 

// Users relations
export const usersRelations = relations(users, ({ one }) => ({
  vendor: one(vendors),
  buyer: one(buyers),
}));

// Vendors relations
export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, { fields: [vendors.user_id], references: [users.user_id] }),
  stalls: many(stalls),
  conversations: many(conversations),
}));

// Buyers relations
export const buyersRelations = relations(buyers, ({ one, many }) => ({
  user: one(users, { fields: [buyers.user_id], references: [users.user_id] }),
  shoppingCart: one(shopping_carts),
  conversations: many(conversations),
  orders: many(orders),
  reviews: many(reviews),
  payments: many(payments),
}));

// Shopping carts relations (ONLY for buyers)
export const shoppingCartsRelations = relations(shopping_carts, ({ one, many }) => ({
  buyer: one(buyers, { 
    fields: [shopping_carts.buyer_id], 
    references: [buyers.user_id] 
  }),
  lineItems: many(line_items),
}));

// Stalls relations (vendors can have multiple stalls)
export const stallsRelations = relations(stalls, ({ one, many }) => ({
  vendor: one(vendors, { 
    fields: [stalls.user_id], 
    references: [vendors.user_id] 
  }),
  stallItems: many(stall_items),
  conversations: many(conversations),
  orders: many(orders),
  reviews: many(reviews),
  sales: many(sales),
}));

export const lineItemsRelations = relations(line_items, ({ one }) => ({
  product: one(stall_items, {
    fields: [line_items.item_id],
    references: [stall_items.item_id],
  }),
}));