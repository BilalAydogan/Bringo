<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612093000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add preferred locale, notifications, and event reminder logs';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE users ADD preferred_locale VARCHAR(5) DEFAULT 'tr' NOT NULL");

        $this->addSql(<<<'SQL'
CREATE TABLE user_notification (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    url VARCHAR(255) DEFAULT NULL,
    is_read BOOLEAN NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    read_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
    PRIMARY KEY(id)
)
SQL);
        $this->addSql('CREATE INDEX idx_user_notification_user ON user_notification (user_id)');
        $this->addSql('CREATE INDEX idx_user_notification_read ON user_notification (user_id, is_read, created_at)');
        $this->addSql('ALTER TABLE user_notification ADD CONSTRAINT fk_user_notification_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql(<<<'SQL'
CREATE TABLE event_reminder_log (
    id UUID NOT NULL,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL,
    stage VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
)
SQL);
        $this->addSql('CREATE UNIQUE INDEX uniq_event_reminder_log ON event_reminder_log (event_id, user_id, channel, stage)');
        $this->addSql('CREATE INDEX idx_event_reminder_log_event ON event_reminder_log (event_id)');
        $this->addSql('CREATE INDEX idx_event_reminder_log_user ON event_reminder_log (user_id)');
        $this->addSql('ALTER TABLE event_reminder_log ADD CONSTRAINT fk_event_reminder_log_event FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE event_reminder_log ADD CONSTRAINT fk_event_reminder_log_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_notification DROP CONSTRAINT fk_user_notification_user');
        $this->addSql('ALTER TABLE event_reminder_log DROP CONSTRAINT fk_event_reminder_log_event');
        $this->addSql('ALTER TABLE event_reminder_log DROP CONSTRAINT fk_event_reminder_log_user');
        $this->addSql('DROP INDEX idx_user_notification_user');
        $this->addSql('DROP INDEX idx_user_notification_read');
        $this->addSql('DROP TABLE user_notification');
        $this->addSql('DROP INDEX uniq_event_reminder_log');
        $this->addSql('DROP INDEX idx_event_reminder_log_event');
        $this->addSql('DROP INDEX idx_event_reminder_log_user');
        $this->addSql('DROP TABLE event_reminder_log');
        $this->addSql('ALTER TABLE users DROP preferred_locale');
    }
}
