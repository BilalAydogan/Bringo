<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612154000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop verification_token from users table after Redis migration';
    }

    public function up(Schema $schema): void
    {
        $usersTable = $schema->getTable('users');

        if ($usersTable->hasColumn('verification_token')) {
            $this->addSql('ALTER TABLE users DROP verification_token');
        }
    }

    public function down(Schema $schema): void
    {
        $usersTable = $schema->getTable('users');

        if (!$usersTable->hasColumn('verification_token')) {
            $this->addSql('ALTER TABLE users ADD verification_token VARCHAR(255) DEFAULT NULL');
        }
    }
}
