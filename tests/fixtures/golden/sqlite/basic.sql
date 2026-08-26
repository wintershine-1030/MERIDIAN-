CREATE TABLE "users" (
  "created_by" TEXT REFERENCES "users" ("id") ON DELETE SET NULL,
  "display" TEXT DEFAULT 'anonymous',
  "email" TEXT NOT NULL UNIQUE,
  "id" TEXT PRIMARY KEY
);

CREATE TABLE "posts" (
  "author" TEXT NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "body" TEXT,
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL
);

CREATE UNIQUE INDEX "posts_author_title_idx" ON "posts" ("author", "title");
