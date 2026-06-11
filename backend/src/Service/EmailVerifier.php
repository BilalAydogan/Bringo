<?php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Uid\Uuid;
use Symfony\Contracts\Translation\TranslatorInterface;

class EmailVerifier
{
    public function __construct(
        private MailerInterface $mailer,
        private EntityManagerInterface $entityManager,
        private EmailTemplateRenderer $emailTemplateRenderer,
        private TranslatorInterface $translator,
        private RequestStack $requestStack,
    ) {
    }

    public function sendEmailConfirmation(User $user, ?string $locale = null): void
    {
        $locale = $this->resolveLocale($locale);
        $token = Uuid::v4()->toRfc4122();
        $user->setVerificationToken($token);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        // In a real application, this URL should point to your frontend
        $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
        $verifyUrl = sprintf(
            '%s/verify-email?%s',
            $frontendUrl,
            http_build_query([
                'token' => $token,
                'lang' => $locale,
            ])
        );

        $email = (new Email())
            ->from('Bringo <noreply@bringo.test>')
            ->to((string) $user->getEmail())
            ->subject($this->translator->trans('email.verification.subject', [], 'messages', $locale))
            ->html($this->emailTemplateRenderer->render(
                title: $this->translator->trans('email.verification.title', [], 'messages', $locale),
                intro: $this->translator->trans('email.verification.intro', [], 'messages', $locale),
                paragraphs: [
                    $this->translator->trans('email.verification.body_1', [], 'messages', $locale),
                    $this->translator->trans('email.verification.body_2', [], 'messages', $locale),
                ],
                preheader: $this->translator->trans('email.verification.preheader', [], 'messages', $locale),
                greeting: $this->greetingFor($user, $locale),
                ctaLabel: $this->translator->trans('email.verification.cta', [], 'messages', $locale),
                ctaUrl: $verifyUrl,
                footerNote: $this->translator->trans('email.verification.footer_note', [], 'messages', $locale),
                documentLocale: $locale,
                brandTagline: $this->translator->trans('email.brand.tagline', [], 'messages', $locale),
                securityBanner: $this->translator->trans('email.brand.security', [], 'messages', $locale),
                footerDisclaimer: $this->translator->trans('email.brand.footer', [], 'messages', $locale),
            ))
            ->text($this->emailTemplateRenderer->renderText(
                title: $this->translator->trans('email.verification.title', [], 'messages', $locale),
                intro: $this->translator->trans('email.verification.intro', [], 'messages', $locale),
                paragraphs: [
                    $this->translator->trans('email.verification.text_body_1', [], 'messages', $locale),
                    $this->translator->trans('email.verification.text_body_2', [], 'messages', $locale),
                ],
                greeting: $this->greetingFor($user, $locale),
                ctaLabel: $this->translator->trans('email.verification.cta', [], 'messages', $locale),
                ctaUrl: $verifyUrl,
                footerNote: $this->translator->trans('email.verification.footer_note', [], 'messages', $locale),
                brandTagline: $this->translator->trans('email.brand.tagline', [], 'messages', $locale),
                footerDisclaimer: $this->translator->trans('email.brand.footer', [], 'messages', $locale),
            ));

        $this->mailer->send($email);
    }

    public function send2FaCode(User $user, string $code, ?string $locale = null): void
    {
        $locale = $this->resolveLocale($locale);
        $email = (new Email())
            ->from('Bringo <noreply@bringo.test>')
            ->to((string) $user->getEmail())
            ->subject($this->translator->trans('email.login.subject', [], 'messages', $locale))
            ->html($this->emailTemplateRenderer->render(
                title: $this->translator->trans('email.login.title', [], 'messages', $locale),
                intro: $this->translator->trans('email.login.intro', [], 'messages', $locale),
                paragraphs: [
                    $this->translator->trans('email.login.body_1', [], 'messages', $locale),
                    $this->translator->trans('email.login.body_2', [], 'messages', $locale),
                ],
                preheader: $this->translator->trans('email.login.preheader', ['%code%' => $code], 'messages', $locale),
                greeting: $this->greetingFor($user, $locale),
                code: $code,
                codeLabel: $this->translator->trans('email.login.code_label', [], 'messages', $locale),
                details: [
                    $this->translator->trans('email.login.detail_validity_label', [], 'messages', $locale) => $this->translator->trans('email.login.detail_validity_value', [], 'messages', $locale),
                    $this->translator->trans('email.login.detail_action_label', [], 'messages', $locale) => $this->translator->trans('email.login.detail_action_value', [], 'messages', $locale),
                ],
                footerNote: $this->translator->trans('email.login.footer_note', [], 'messages', $locale),
                documentLocale: $locale,
                brandTagline: $this->translator->trans('email.brand.tagline', [], 'messages', $locale),
                securityBanner: $this->translator->trans('email.brand.security', [], 'messages', $locale),
                footerDisclaimer: $this->translator->trans('email.brand.footer', [], 'messages', $locale),
            ))
            ->text($this->emailTemplateRenderer->renderText(
                title: $this->translator->trans('email.login.title', [], 'messages', $locale),
                intro: $this->translator->trans('email.login.intro', [], 'messages', $locale),
                paragraphs: [
                    $this->translator->trans('email.login.body_1', [], 'messages', $locale),
                    $this->translator->trans('email.login.body_2', [], 'messages', $locale),
                ],
                greeting: $this->greetingFor($user, $locale),
                code: $code,
                codeLabel: $this->translator->trans('email.login.code_label', [], 'messages', $locale),
                details: [
                    $this->translator->trans('email.login.detail_validity_label', [], 'messages', $locale) => $this->translator->trans('email.login.detail_validity_value', [], 'messages', $locale),
                    $this->translator->trans('email.login.detail_action_label', [], 'messages', $locale) => $this->translator->trans('email.login.detail_action_value', [], 'messages', $locale),
                ],
                footerNote: $this->translator->trans('email.login.footer_note', [], 'messages', $locale),
                brandTagline: $this->translator->trans('email.brand.tagline', [], 'messages', $locale),
                footerDisclaimer: $this->translator->trans('email.brand.footer', [], 'messages', $locale),
            ));

        $this->mailer->send($email);
    }

    private function greetingFor(User $user, string $locale): string
    {
        $name = trim(sprintf('%s %s', $user->getFirstName() ?? '', $user->getLastName() ?? ''));

        $greeting = $this->translator->trans('email.greeting', ['%name%' => $name], 'messages', $locale);

        return $name === ''
            ? $this->translator->trans('email.greeting_generic', [], 'messages', $locale)
            : $greeting;
    }

    private function resolveLocale(?string $locale): string
    {
        $candidate = $locale ?: $this->requestStack->getCurrentRequest()?->getLocale() ?: $this->translator->getLocale();
        $candidate = strtolower(str_replace('_', '-', $candidate));

        return str_starts_with($candidate, 'en') ? 'en' : 'tr';
    }
}
