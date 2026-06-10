<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260610120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add firstName and lastName to users, seed default user agreement contract';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "users" ADD first_name VARCHAR(100) NOT NULL DEFAULT \'\'');
        $this->addSql('ALTER TABLE "users" ADD last_name VARCHAR(100) NOT NULL DEFAULT \'\'');
        $this->addSql('ALTER TABLE "users" ALTER COLUMN first_name DROP DEFAULT');
        $this->addSql('ALTER TABLE "users" ALTER COLUMN last_name DROP DEFAULT');

        $this->addSql(<<<'SQL'
INSERT INTO contract (id, title, content, version, is_required, created_at)
SELECT '00000000-0000-4000-8000-000000000001', 'Kullanıcı Sözleşmesi', 'Bringo platformunu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız:

1. Hesap bilgilerinizin doğruluğundan ve gizliliğinden siz sorumlusunuz.
2. Platformu yasalara ve topluluk kurallarına uygun şekilde kullanmayı kabul edersiniz.
3. Kişisel verileriniz, hizmetin sunulması amacıyla işlenir ve üçüncü taraflarla paylaşılmaz.
4. Bringo, hizmet koşullarını önceden bildirimde bulunarak güncelleme hakkını saklı tutar.
5. Hesabınızı istediğiniz zaman kapatabilir veya destek ekibimizle iletişime geçebilirsiniz.

Bu sözleşmeyi kabul ederek Bringo hizmetlerini kullanmaya başlayabilirsiniz.', 1.0, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM contract WHERE title = 'Kullanıcı Sözleşmesi')
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DELETE FROM contract WHERE id = \'00000000-0000-4000-8000-000000000001\'');
        $this->addSql('ALTER TABLE "users" DROP first_name');
        $this->addSql('ALTER TABLE "users" DROP last_name');
    }
}
