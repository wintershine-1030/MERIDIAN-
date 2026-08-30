CREATE TABLE "scalars" (
  "active" boolean NOT NULL,
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL,
  "notes" text,
  "quantity" integer NOT NULL
);
