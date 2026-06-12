<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612143000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add password reset token fields to users';
    }

    public function up(Schema $schema): void
    {
        $usersTable = $schema->getTable('users');

        if (!$usersTable->hasColumn('password_reset_token')) {
            $this->addSql('ALTER TABLE users ADD password_reset_token VARCHAR(255) DEFAULT NULL');
        }

        if (!$usersTable->hasColumn('password_reset_expires_at')) {
            $this->addSql('ALTER TABLE users ADD password_reset_expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        }
    }

    public function down(Schema $schema): void
    {
        $usersTable = $schema->getTable('users');

        if ($usersTable->hasColumn('password_reset_token')) {
            $this->addSql('ALTER TABLE users DROP password_reset_token');
        }

        if ($usersTable->hasColumn('password_reset_expires_at')) {
            $this->addSql('ALTER TABLE users DROP password_reset_expires_at');
        }
    }
}
