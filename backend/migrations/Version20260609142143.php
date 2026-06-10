<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260609142143 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE contract (id UUID NOT NULL, title VARCHAR(255) NOT NULL, content TEXT NOT NULL, version DOUBLE PRECISION NOT NULL, is_required BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE event (id UUID NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, date TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, location VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, created_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_3BAE0AA7B03A8386 ON event (created_by_id)');
        $this->addSql('CREATE TABLE event_participant (id UUID NOT NULL, status VARCHAR(50) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, event_id UUID NOT NULL, user_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_7C16B89171F7E88B ON event_participant (event_id)');
        $this->addSql('CREATE INDEX IDX_7C16B891A76ED395 ON event_participant (user_id)');
        $this->addSql('CREATE TABLE item (id UUID NOT NULL, name VARCHAR(255) NOT NULL, status VARCHAR(50) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, event_id UUID NOT NULL, assigned_to_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_1F1B251E71F7E88B ON item (event_id)');
        $this->addSql('CREATE INDEX IDX_1F1B251EF4BD7827 ON item (assigned_to_id)');
        $this->addSql('CREATE TABLE user_contract (id UUID NOT NULL, accepted_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, ip_address VARCHAR(45) DEFAULT NULL, user_id UUID NOT NULL, contract_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_902CC59A76ED395 ON user_contract (user_id)');
        $this->addSql('CREATE INDEX IDX_902CC592576E0FD ON user_contract (contract_id)');
        $this->addSql('CREATE TABLE "users" (id UUID NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1483A5E9E7927C74 ON "users" (email)');
        $this->addSql('ALTER TABLE event ADD CONSTRAINT FK_3BAE0AA7B03A8386 FOREIGN KEY (created_by_id) REFERENCES "users" (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE event_participant ADD CONSTRAINT FK_7C16B89171F7E88B FOREIGN KEY (event_id) REFERENCES event (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE event_participant ADD CONSTRAINT FK_7C16B891A76ED395 FOREIGN KEY (user_id) REFERENCES "users" (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT FK_1F1B251E71F7E88B FOREIGN KEY (event_id) REFERENCES event (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT FK_1F1B251EF4BD7827 FOREIGN KEY (assigned_to_id) REFERENCES "users" (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE user_contract ADD CONSTRAINT FK_902CC59A76ED395 FOREIGN KEY (user_id) REFERENCES "users" (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE user_contract ADD CONSTRAINT FK_902CC592576E0FD FOREIGN KEY (contract_id) REFERENCES contract (id) NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE event DROP CONSTRAINT FK_3BAE0AA7B03A8386');
        $this->addSql('ALTER TABLE event_participant DROP CONSTRAINT FK_7C16B89171F7E88B');
        $this->addSql('ALTER TABLE event_participant DROP CONSTRAINT FK_7C16B891A76ED395');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT FK_1F1B251E71F7E88B');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT FK_1F1B251EF4BD7827');
        $this->addSql('ALTER TABLE user_contract DROP CONSTRAINT FK_902CC59A76ED395');
        $this->addSql('ALTER TABLE user_contract DROP CONSTRAINT FK_902CC592576E0FD');
        $this->addSql('DROP TABLE contract');
        $this->addSql('DROP TABLE event');
        $this->addSql('DROP TABLE event_participant');
        $this->addSql('DROP TABLE item');
        $this->addSql('DROP TABLE user_contract');
        $this->addSql('DROP TABLE "users"');
    }
}
