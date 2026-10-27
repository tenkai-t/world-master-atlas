CREATE TABLE `player_ranking_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`player_id` text NOT NULL,
	`department` text NOT NULL,
	`version` text NOT NULL,
	`questions` text NOT NULL,
	`answers` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`right_count` integer DEFAULT 0 NOT NULL,
	`started` integer NOT NULL,
	`finished` integer
);
--> statement-breakpoint
CREATE INDEX `player_runs_owner_started` ON `player_ranking_runs` (`owner_id`,`started`);--> statement-breakpoint
CREATE TABLE `player_ranking_scores` (
	`player_id` text NOT NULL,
	`department` text NOT NULL,
	`version` text NOT NULL,
	`right_count` integer NOT NULL,
	`question_count` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`at` integer NOT NULL,
	`run_id` text NOT NULL,
	`outcome` text NOT NULL,
	PRIMARY KEY(`player_id`, `department`, `version`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_ranking_scores_run_id_unique` ON `player_ranking_scores` (`run_id`);--> statement-breakpoint
CREATE TABLE `ranking_players` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`secret_hash` text NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`revision` integer NOT NULL,
	`mutation` text NOT NULL
);
