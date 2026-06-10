<?php

namespace App\MessageHandler;

use App\Message\SendContractOtpMessage;
use App\Service\EmailTemplateRenderer;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Mime\Email;

#[AsMessageHandler]
final class SendContractOtpMessageHandler
{
    public function __construct(
        private MailerInterface $mailer,
        private EmailTemplateRenderer $emailTemplateRenderer,
    ) {
    }

    public function __invoke(SendContractOtpMessage $message): void
    {
        $email = (new Email())
            ->from('Bringo <noreply@bringo.test>')
            ->to($message->email)
            ->subject('Bringo sözleşme onay kodunuz')
            ->html($this->emailTemplateRenderer->render(
                title: 'Sözleşme onay kodunuz',
                intro: sprintf('%s sözleşmesini onaylamak için aşağıdaki kodu kullanın.', $message->contractTitle),
                paragraphs: [
                    'Bu kod 10 dakika boyunca geçerlidir.',
                    'Onay işlemini siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.',
                ],
                preheader: sprintf('Bringo sözleşme onay kodunuz: %s', $message->code),
                code: $message->code,
                codeLabel: 'Onay kodu',
                details: [
                    'Sözleşme' => $message->contractTitle,
                    'Geçerlilik' => '10 dakika',
                ],
                footerNote: 'Kod süresi dolarsa Bringo içinden yeni bir kod isteyebilirsiniz.',
            ))
            ->text($this->emailTemplateRenderer->renderText(
                title: 'Sözleşme onay kodunuz',
                intro: sprintf('%s sözleşmesini onaylamak için aşağıdaki kodu kullanın.', $message->contractTitle),
                paragraphs: [
                    'Bu kod 10 dakika boyunca geçerlidir.',
                    'Onay işlemini siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.',
                ],
                code: $message->code,
                codeLabel: 'Onay kodu',
                details: [
                    'Sözleşme' => $message->contractTitle,
                    'Geçerlilik' => '10 dakika',
                ],
                footerNote: 'Kod süresi dolarsa Bringo içinden yeni bir kod isteyebilirsiniz.',
            ));

        $this->mailer->send($email);
    }
}
