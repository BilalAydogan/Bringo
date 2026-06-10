<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260610140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add is_active to contracts; only latest version remains required';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE contract ADD is_active BOOLEAN NOT NULL DEFAULT false');
        $this->addSql('UPDATE contract SET is_active = false, is_required = false');
        $this->addSql(<<<'SQL'
UPDATE contract SET is_active = true, is_required = true
WHERE version = (SELECT MAX(version) FROM contract)
SQL);
        $this->addSql('ALTER TABLE contract ALTER COLUMN is_active DROP DEFAULT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE contract DROP is_active');
        $this->addSql('UPDATE contract SET is_required = true');
    }
}
