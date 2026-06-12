<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612152000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop transient auth fields from users table after Redis migration';
    }

    public function up(Schema $schema): void
    {
        $usersTable = $schema->getTable('users');

        if ($usersTable->hasColumn('two_factor_code')) {
            $this->addSql('ALTER TABLE users DROP two_factor_code');
        }

        if ($usersTable->hasColumn('two_factor_expires_at')) {
            $this->addSql('ALTER TABLE users DROP two_factor_expires_at');
        }

        if ($usersTable->hasColumn('password_reset_token')) {
            $this->addSql('ALTER TABLE users DROP password_reset_token');
        }

        if ($usersTable->hasColumn('password_reset_expires_at')) {
            $this->addSql('ALTER TABLE users DROP password_reset_expires_at');
        }
    }

    public function down(Schema $schema): void
    {
        $usersTable = $schema->getTable('users');

        if (!$usersTable->hasColumn('two_factor_code')) {
            $this->addSql('ALTER TABLE users ADD two_factor_code VARCHAR(6) DEFAULT NULL');
        }

        if (!$usersTable->hasColumn('two_factor_expires_at')) {
            $this->addSql('ALTER TABLE users ADD two_factor_expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        }

        if (!$usersTable->hasColumn('password_reset_token')) {
            $this->addSql('ALTER TABLE users ADD password_reset_token VARCHAR(255) DEFAULT NULL');
        }

        if (!$usersTable->hasColumn('password_reset_expires_at')) {
            $this->addSql('ALTER TABLE users ADD password_reset_expires_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        }
    }
}
