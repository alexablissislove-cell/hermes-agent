CREATE TABLE `alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`latencyMs` double NOT NULL DEFAULT 800,
	`errorRate` double NOT NULL DEFAULT 0.05,
	`messagesPerSecond` double NOT NULL DEFAULT 0,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gateway_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`botToken` text,
	`webhookUrl` text,
	`allowedChatIds` json NOT NULL,
	`rateLimitPerMinute` int NOT NULL DEFAULT 30,
	`maxConnections` int NOT NULL DEFAULT 100,
	`requestTimeoutMs` int NOT NULL DEFAULT 10000,
	`webhookSecret` varchar(128),
	`enabled` boolean NOT NULL DEFAULT false,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gateway_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gateway_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`level` enum('info','warn','error','debug') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`context` json,
	CONSTRAINT `gateway_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gateway_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`uptimeSeconds` int NOT NULL DEFAULT 0,
	`messagesPerSecond` double NOT NULL DEFAULT 0,
	`activeConnections` int NOT NULL DEFAULT 0,
	`latencyMs` double NOT NULL DEFAULT 0,
	`errorRate` double NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `gateway_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiKeys` json NOT NULL,
	`ipAllowlist` json NOT NULL,
	`accessControlRules` json NOT NULL,
	`lastTokenRotationAt` timestamp,
	`requireSignedWebhooks` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `security_rules_id` PRIMARY KEY(`id`)
);
