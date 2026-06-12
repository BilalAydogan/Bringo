<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612113000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add timezone to events';
    }

    public function up(Schema $schema): void
    {
        $eventTable = $schema->getTable('event');
        if ($eventTable->hasColumn('timezone')) {
            return;
        }

        $this->addSql("ALTER TABLE event ADD timezone VARCHAR(64) DEFAULT 'UTC' NOT NULL");
        $this->addSql("UPDATE event SET timezone = 'UTC' WHERE timezone IS NULL OR timezone = ''");
    }

    public function down(Schema $schema): void
    {
        $eventTable = $schema->getTable('event');
        if (!$eventTable->hasColumn('timezone')) {
            return;
        }

        $this->addSql('ALTER TABLE event DROP timezone');
    }
}
