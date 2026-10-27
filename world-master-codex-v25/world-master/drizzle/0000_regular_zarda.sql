CREATE TABLE `ranking_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`department` text NOT NULL,
	`version` text NOT NULL,
	`nickname` text NOT NULL,
	`questions` text NOT NULL,
	`answers` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`right_count` integer DEFAULT 0 NOT NULL,
	`started` integer NOT NULL,
	`finished` integer
);
--> statement-breakpoint
CREATE INDEX `runs_user_started` ON `ranking_runs` (`user_id`,`started`);--> statement-breakpoint
CREATE TABLE `ranking_scores` (
	`user_id` text NOT NULL,
	`department` text NOT NULL,
	`version` text NOT NULL,
	`nickname` text NOT NULL,
	`right_count` integer NOT NULL,
	`question_count` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`at` integer NOT NULL,
	`run_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `department`, `version`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ranking_scores_run_id_unique` ON `ranking_scores` (`run_id`);