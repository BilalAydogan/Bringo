<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260611120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add localized translations for contracts';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
CREATE TABLE contract_translation (
    id UUID NOT NULL,
    contract_id UUID NOT NULL,
    locale VARCHAR(5) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY(id)
)
SQL);
        $this->addSql('CREATE UNIQUE INDEX uniq_contract_translation_locale ON contract_translation (contract_id, locale)');
        $this->addSql('CREATE INDEX idx_contract_translation_contract ON contract_translation (contract_id)');
        $this->addSql('ALTER TABLE contract_translation ADD CONSTRAINT fk_contract_translation_contract FOREIGN KEY (contract_id) REFERENCES contract (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE contract_translation DROP CONSTRAINT fk_contract_translation_contract');
        $this->addSql('DROP INDEX uniq_contract_translation_locale');
        $this->addSql('DROP INDEX idx_contract_translation_contract');
        $this->addSql('DROP TABLE contract_translation');
    }
}
