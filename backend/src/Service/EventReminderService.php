<?php

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventParticipant;
use App\Entity\EventReminderLog;
use App\Entity\User;
use App\Repository\EventParticipantRepository;
use App\Repository\EventReminderLogRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Contracts\Translation\TranslatorInterface;

class EventReminderService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly EventParticipantRepository $participantRepository,
        private readonly EventReminderLogRepository $reminderLogRepository,
        private readonly NotificationService $notificationService,
        private readonly MailerInterface $mailer,
        private readonly EmailTemplateRenderer $emailTemplateRenderer,
        private readonly TranslatorInterface $translator,
    ) {
    }

    /**
     * @return array{notifications:int,emails:int}
     */
    public function sendRemindersForEvent(Event $event, string $stage): array
    {
        $notifications = 0;
        $emails = 0;

        foreach ($this->resolveRecipients($event) as $user) {
            if (!$this->reminderLogRepository->hasReminder($event, $user, 'notification', $stage)) {
                [$title, $message] = $this->buildNotificationContent($event, $user->getPreferredLocale(), $stage);
                $this->notificationService->create(
                    $user,
                    'event_reminder',
                    $title,
                    $message,
                    sprintf('/events/%s', $event->getId()?->toRfc4122()),
                );
                $this->storeLog($event, $user, 'notification', $stage);
                ++$notifications;
            }

            if (!$this->reminderLogRepository->hasReminder($event, $user, 'email', $stage)) {
                $this->sendReminderEmail($event, $user, $stage);
                $this->storeLog($event, $user, 'email', $stage);
                ++$emails;
            }
        }

        $this->entityManager->flush();

        return [
            'notifications' => $notifications,
            'emails' => $emails,
        ];
    }

    /**
     * @return list<User>
     */
    private function resolveRecipients(Event $event): array
    {
        $users = [];
        $owner = $event->getCreatedBy();

        if ($owner instanceof User) {
            $users[] = $owner;
        }

        foreach ($this->participantRepository->findBy(['event' => $event, 'status' => EventParticipant::STATUS_ACCEPTED]) as $participant) {
            if (!$participant instanceof EventParticipant) {
                continue;
            }

            $user = $participant->getUser();
            if ($user instanceof User) {
                $users[$user->getId()?->toRfc4122() ?? spl_object_hash($user)] = $user;
            }
        }

        return array_values($users);
    }

    private function storeLog(Event $event, User $user, string $channel, string $stage): void
    {
        $log = new EventReminderLog();
        $log->setEvent($event);
        $log->setUser($user);
        $log->setChannel($channel);
        $log->setStage($stage);

        $this->entityManager->persist($log);
    }

    /**
     * @return array{string,string}
     */
    private function buildNotificationContent(Event $event, string $locale, string $stage): array
    {
        $formattedDate = $this->formatEventDate($event, $locale);
        $title = $this->trans(sprintf('event_reminder.notification.%s.title', $stage), [], $locale);
        $message = $this->trans(
            sprintf('event_reminder.notification.%s.message', $stage),
            [
                '%event%' => (string) $event->getTitle(),
                '%date%' => $formattedDate,
            ],
            $locale,
        );

        return [$title, $message];
    }

    private function sendReminderEmail(Event $event, User $user, string $stage): void
    {
        $locale = $user->getPreferredLocale();
        [$title, $intro, $paragraphs, $ctaLabel, $footerNote] = $this->buildEmailCopy($event, $locale, $stage);

        $email = (new Email())
            ->from('Bringo <noreply@bringo.test>')
            ->to((string) $user->getEmail())
            ->subject($title)
            ->html($this->emailTemplateRenderer->render(
                title: $title,
                intro: $intro,
                paragraphs: $paragraphs,
                ctaLabel: $ctaLabel,
                ctaUrl: $this->eventUrl($event),
                footerNote: $footerNote,
                greeting: $this->buildGreeting($user, $locale),
                details: [
                    $this->trans('event_reminder.email.details.event', [], $locale) => (string) $event->getTitle(),
                    $this->trans('event_reminder.email.details.date', [], $locale) => $this->formatEventDate($event, $locale),
                    $this->trans('event_reminder.email.details.location', [], $locale) => (string) ($event->getLocation() ?: $this->trans('event_reminder.email.details.location_unspecified', [], $locale)),
                ],
                documentLocale: $locale,
                brandTagline: $this->trans('event_reminder.email.brand_tagline', [], $locale),
                securityBanner: $this->trans('event_reminder.email.security_banner', [], $locale),
                footerDisclaimer: $this->trans('event_reminder.email.footer_disclaimer', [], $locale),
            ))
            ->text($this->emailTemplateRenderer->renderText(
                title: $title,
                intro: $intro,
                paragraphs: $paragraphs,
                greeting: $this->buildGreeting($user, $locale),
                ctaLabel: $ctaLabel,
                ctaUrl: $this->eventUrl($event),
                footerNote: $footerNote,
                details: [
                    $this->trans('event_reminder.email.details.event', [], $locale) => (string) $event->getTitle(),
                    $this->trans('event_reminder.email.details.date', [], $locale) => $this->formatEventDate($event, $locale),
                    $this->trans('event_reminder.email.details.location', [], $locale) => (string) ($event->getLocation() ?: $this->trans('event_reminder.email.details.location_unspecified', [], $locale)),
                ],
                brandTagline: $this->trans('event_reminder.email.brand_tagline', [], $locale),
                footerDisclaimer: $this->trans('event_reminder.email.footer_disclaimer', [], $locale),
            ));

        $this->mailer->send($email);
    }

    /**
     * @return array{string,string,list<string>,string,string}
     */
    private function buildEmailCopy(Event $event, string $locale, string $stage): array
    {
        return [
            $this->trans(sprintf('event_reminder.email.%s.subject', $stage), [], $locale),
            $this->trans(
                sprintf('event_reminder.email.%s.intro', $stage),
                ['%event%' => (string) $event->getTitle()],
                $locale,
            ),
            [
                $this->trans(sprintf('event_reminder.email.%s.body', $stage), [], $locale),
            ],
            $this->trans('event_reminder.email.cta', [], $locale),
            $this->trans('event_reminder.email.footer_note', [], $locale),
        ];
    }

    private function buildGreeting(User $user, string $locale): string
    {
        $fullName = trim(sprintf('%s %s', (string) $user->getFirstName(), (string) $user->getLastName()));
        return $fullName !== ''
            ? $this->trans('email.greeting', ['%name%' => $fullName], $locale)
            : $this->trans('email.greeting_generic', [], $locale);
    }

    private function formatEventDate(Event $event, string $locale): string
    {
        $date = $event->getDate();
        if ($date === null) {
            return $locale === 'en' ? 'Unknown date' : 'Bilinmeyen tarih';
        }

        $timezone = new \DateTimeZone($event->getTimezone());
        $localized = \DateTimeImmutable::createFromInterface($date)->setTimezone($timezone);

        return $locale === 'en'
            ? sprintf('%s (%s)', $localized->format('M d, Y H:i'), $event->getTimezone())
            : sprintf('%s (%s)', $localized->format('d.m.Y H:i'), $event->getTimezone());
    }

    private function eventUrl(Event $event): string
    {
        $baseUrl = rtrim($_ENV['DEFAULT_URI'] ?? 'http://localhost:5173', '/');

        return sprintf('%s/events/%s', $baseUrl, $event->getId()?->toRfc4122());
    }

    private function trans(string $key, array $parameters = [], string $locale = 'tr'): string
    {
        return $this->translator->trans($key, $parameters, 'messages', $locale);
    }
}
