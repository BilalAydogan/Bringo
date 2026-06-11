<?php

namespace App\MessageHandler;

use App\Message\SendContractOtpMessage;
use App\Service\EmailTemplateRenderer;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Mime\Email;
use Symfony\Contracts\Translation\TranslatorInterface;

#[AsMessageHandler]
final class SendContractOtpMessageHandler
{
    public function __construct(
        private MailerInterface $mailer,
        private EmailTemplateRenderer $emailTemplateRenderer,
        private TranslatorInterface $translator,
    ) {
    }

    public function __invoke(SendContractOtpMessage $message): void
    {
        $locale = $this->normalizeLocale($message->locale);

        $email = (new Email())
            ->from('Bringo <noreply@bringo.test>')
            ->to($message->email)
            ->subject($this->translator->trans('email.contract.subject', [], 'messages', $locale))
            ->html($this->emailTemplateRenderer->render(
                title: $this->translator->trans('email.contract.title', [], 'messages', $locale),
                intro: $this->translator->trans('email.contract.intro', ['%contract%' => $message->contractTitle], 'messages', $locale),
                paragraphs: [
                    $this->translator->trans('email.contract.body_1', [], 'messages', $locale),
                    $this->translator->trans('email.contract.body_2', [], 'messages', $locale),
                ],
                preheader: $this->translator->trans('email.contract.preheader', ['%code%' => $message->code], 'messages', $locale),
                code: $message->code,
                codeLabel: $this->translator->trans('email.contract.code_label', [], 'messages', $locale),
                details: [
                    $this->translator->trans('email.contract.detail_contract_label', [], 'messages', $locale) => $message->contractTitle,
                    $this->translator->trans('email.contract.detail_validity_label', [], 'messages', $locale) => $this->translator->trans('email.contract.detail_validity_value', [], 'messages', $locale),
                ],
                footerNote: $this->translator->trans('email.contract.footer_note', [], 'messages', $locale),
                documentLocale: $locale,
                brandTagline: $this->translator->trans('email.brand.tagline', [], 'messages', $locale),
                securityBanner: $this->translator->trans('email.brand.security', [], 'messages', $locale),
                footerDisclaimer: $this->translator->trans('email.brand.footer', [], 'messages', $locale),
            ))
            ->text($this->emailTemplateRenderer->renderText(
                title: $this->translator->trans('email.contract.title', [], 'messages', $locale),
                intro: $this->translator->trans('email.contract.intro', ['%contract%' => $message->contractTitle], 'messages', $locale),
                paragraphs: [
                    $this->translator->trans('email.contract.body_1', [], 'messages', $locale),
                    $this->translator->trans('email.contract.body_2', [], 'messages', $locale),
                ],
                code: $message->code,
                codeLabel: $this->translator->trans('email.contract.code_label', [], 'messages', $locale),
                details: [
                    $this->translator->trans('email.contract.detail_contract_label', [], 'messages', $locale) => $message->contractTitle,
                    $this->translator->trans('email.contract.detail_validity_label', [], 'messages', $locale) => $this->translator->trans('email.contract.detail_validity_value', [], 'messages', $locale),
                ],
                footerNote: $this->translator->trans('email.contract.footer_note', [], 'messages', $locale),
                brandTagline: $this->translator->trans('email.brand.tagline', [], 'messages', $locale),
                footerDisclaimer: $this->translator->trans('email.brand.footer', [], 'messages', $locale),
            ));

        $this->mailer->send($email);
    }

    private function normalizeLocale(string $locale): string
    {
        return str_starts_with(strtolower($locale), 'en') ? 'en' : 'tr';
    }
}
