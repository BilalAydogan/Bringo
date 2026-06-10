<?php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Uid\Uuid;

class EmailVerifier
{
    public function __construct(
        private MailerInterface $mailer,
        private EntityManagerInterface $entityManager,
        private EmailTemplateRenderer $emailTemplateRenderer,
    ) {
    }

    public function sendEmailConfirmation(User $user): void
    {
        $token = Uuid::v4()->toRfc4122();
        $user->setVerificationToken($token);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        // In a real application, this URL should point to your frontend
        $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
        $verifyUrl = sprintf('%s/verify-email?token=%s', $frontendUrl, $token);

        $email = (new Email())
            ->from('Bringo <noreply@bringo.test>')
            ->to((string) $user->getEmail())
            ->subject('Bringo e-posta doğrulama')
            ->html($this->emailTemplateRenderer->render(
                title: 'E-posta adresinizi doğrulayın',
                intro: 'Bringo hesabınızı kullanmaya başlamak için e-posta adresinizi doğrulamanız gerekiyor.',
                paragraphs: [
                    'Aşağıdaki butona tıklayarak hesabınızı doğrulayabilirsiniz.',
                    'Bu işlemi siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.',
                ],
                preheader: 'Bringo hesabınız için e-posta doğrulama bağlantınız hazır.',
                greeting: $this->greetingFor($user),
                ctaLabel: 'E-postamı doğrula',
                ctaUrl: $verifyUrl,
                footerNote: 'Güvenliğiniz için doğrulama bağlantısını kimseyle paylaşmayın.',
            ))
            ->text($this->emailTemplateRenderer->renderText(
                title: 'E-posta adresinizi doğrulayın',
                intro: 'Bringo hesabınızı kullanmaya başlamak için e-posta adresinizi doğrulamanız gerekiyor.',
                paragraphs: [
                    'Aşağıdaki bağlantıyı açarak hesabınızı doğrulayabilirsiniz.',
                    'Bu işlemi siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.',
                ],
                greeting: $this->greetingFor($user),
                ctaLabel: 'E-postamı doğrula',
                ctaUrl: $verifyUrl,
                footerNote: 'Güvenliğiniz için doğrulama bağlantısını kimseyle paylaşmayın.',
            ));

        $this->mailer->send($email);
    }

    public function send2FaCode(User $user, string $code): void
    {
        $email = (new Email())
            ->from('Bringo <noreply@bringo.test>')
            ->to((string) $user->getEmail())
            ->subject('Bringo giriş doğrulama kodunuz')
            ->html($this->emailTemplateRenderer->render(
                title: 'Giriş doğrulama kodunuz',
                intro: 'Bringo hesabınıza giriş işlemini tamamlamak için aşağıdaki kodu kullanın.',
                paragraphs: [
                    'Kod 10 dakika boyunca geçerlidir.',
                    'Bu giriş denemesini siz yapmadıysanız parolanızı değiştirmenizi öneririz.',
                ],
                preheader: sprintf('Bringo giriş kodunuz: %s', $code),
                greeting: $this->greetingFor($user),
                code: $code,
                codeLabel: 'Giriş kodu',
                details: [
                    'Geçerlilik' => '10 dakika',
                    'İşlem' => 'Hesap girişi',
                ],
                footerNote: 'Bringo ekibi bu kodu sizden hiçbir zaman istemez.',
            ))
            ->text($this->emailTemplateRenderer->renderText(
                title: 'Giriş doğrulama kodunuz',
                intro: 'Bringo hesabınıza giriş işlemini tamamlamak için aşağıdaki kodu kullanın.',
                paragraphs: [
                    'Kod 10 dakika boyunca geçerlidir.',
                    'Bu giriş denemesini siz yapmadıysanız parolanızı değiştirmenizi öneririz.',
                ],
                greeting: $this->greetingFor($user),
                code: $code,
                codeLabel: 'Giriş kodu',
                details: [
                    'Geçerlilik' => '10 dakika',
                    'İşlem' => 'Hesap girişi',
                ],
                footerNote: 'Bringo ekibi bu kodu sizden hiçbir zaman istemez.',
            ));

        $this->mailer->send($email);
    }

    private function greetingFor(User $user): string
    {
        $name = trim(sprintf('%s %s', $user->getFirstName() ?? '', $user->getLastName() ?? ''));

        return $name === '' ? 'Merhaba,' : sprintf('Merhaba %s,', $name);
    }
}
