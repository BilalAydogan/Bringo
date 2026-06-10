<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260610094232 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE item_assignment (id UUID NOT NULL, quantity INT NOT NULL, status VARCHAR(50) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, item_id UUID NOT NULL, user_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_8D746CB0126F525E ON item_assignment (item_id)');
        $this->addSql('CREATE INDEX IDX_8D746CB0A76ED395 ON item_assignment (user_id)');
        $this->addSql('ALTER TABLE item_assignment ADD CONSTRAINT FK_8D746CB0126F525E FOREIGN KEY (item_id) REFERENCES item (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item_assignment ADD CONSTRAINT FK_8D746CB0A76ED395 FOREIGN KEY (user_id) REFERENCES "users" (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE item DROP CONSTRAINT fk_1f1b251ef4bd7827');
        $this->addSql('DROP INDEX idx_1f1b251ef4bd7827');
        $this->addSql('ALTER TABLE item DROP assigned_to_id');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE item_assignment DROP CONSTRAINT FK_8D746CB0126F525E');
        $this->addSql('ALTER TABLE item_assignment DROP CONSTRAINT FK_8D746CB0A76ED395');
        $this->addSql('DROP TABLE item_assignment');
        $this->addSql('ALTER TABLE item ADD assigned_to_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE item ADD CONSTRAINT fk_1f1b251ef4bd7827 FOREIGN KEY (assigned_to_id) REFERENCES users (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX idx_1f1b251ef4bd7827 ON item (assigned_to_id)');
    }
}
