<?php

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Contracts\Translation\LocaleAwareInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

class LocaleSubscriber implements EventSubscriberInterface
{
    private const SUPPORTED_LOCALES = ['tr', 'en'];

    public function __construct(private TranslatorInterface $translator)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 20],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $locale = $this->resolveLocale($request);

        $request->setLocale($locale);
        if ($this->translator instanceof LocaleAwareInterface) {
            $this->translator->setLocale($locale);
        }
    }

    private function resolveLocale(Request $request): string
    {
        $candidates = [
            $request->query->getString('lang'),
            $request->headers->get('X-Locale'),
            $request->headers->get('Accept-Language'),
        ];

        foreach ($candidates as $candidate) {
            $locale = $this->normalizeLocale($candidate);
            if ($locale !== null) {
                return $locale;
            }
        }

        $preferred = $this->normalizeLocale($request->getPreferredLanguage(self::SUPPORTED_LOCALES));
        return $preferred ?? 'tr';
    }

    private function normalizeLocale(?string $locale): ?string
    {
        if ($locale === null || $locale === '') {
            return null;
        }

        $value = strtolower(str_replace('_', '-', $locale));

        return match (true) {
            str_starts_with($value, 'tr') => 'tr',
            str_starts_with($value, 'en') => 'en',
            default => null,
        };
    }
}
