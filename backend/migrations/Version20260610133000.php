<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260610133000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add v2 user agreement to demonstrate contract checkpoint flow';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
INSERT INTO contract (id, title, content, version, is_required, created_at)
SELECT '00000000-0000-4000-8000-000000000002', 'Kullanıcı Sözleşmesi', 'Bringo Kullanıcı Sözleşmesi (Sürüm 2.0)

Bu güncellenmiş sözleşmeyi kabul ederek aşağıdaki şartları onaylamış olursunuz:

1. Hesap bilgilerinizin güncel ve doğru tutulmasından siz sorumlusunuz.
2. Platformu yasalara ve topluluk kurallarına uygun şekilde kullanmayı kabul edersiniz.
3. Kişisel verileriniz yalnızca hizmet sunumu amacıyla işlenir.
4. Bringo, sözleşme koşullarını güncelleme hakkını saklı tutar; önemli değişikliklerde yeniden onay istenebilir.
5. Hesabınızı istediğiniz zaman kapatabilir veya destek ekibimizle iletişime geçebilirsiniz.

Bu sürümü onaylayarak Bringo hizmetlerini kullanmaya devam edebilirsiniz.', 2.0, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM contract WHERE version = 2.0)
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DELETE FROM user_contract WHERE contract_id = \'00000000-0000-4000-8000-000000000002\'');
        $this->addSql('DELETE FROM contract WHERE id = \'00000000-0000-4000-8000-000000000002\'');
    }
}
