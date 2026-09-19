CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`transcript` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`collection` text DEFAULT 'Inbox' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`name` text PRIMARY KEY NOT NULL
);
