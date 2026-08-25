CREATE TABLE "users" (
  "created_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "display" text DEFAULT 'anonymous',
  "email" text NOT NULL UNIQUE,
  "id" uuid PRIMARY KEY
);

CREATE TABLE "posts" (
  "author" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "body" text,
  "id" uuid PRIMARY KEY,
  "title" text NOT NULL
);

CREATE UNIQUE INDEX "posts_author_title_idx" ON "posts" ("author", "title");
