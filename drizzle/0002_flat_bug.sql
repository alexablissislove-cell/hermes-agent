CREATE TABLE `webhook_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`updateId` int NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('accepted','duplicate','rejected','failed') NOT NULL,
	`payload` json NOT NULL,
	`errorMessage` text,
	CONSTRAINT `webhook_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_deliveries_updateId_unique` UNIQUE(`updateId`)
);
