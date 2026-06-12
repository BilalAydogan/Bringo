<?php

namespace App\EventSubscriber;

use App\Exception\ApiException;
use App\Http\ApiResponse;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Validator\Exception\ValidationFailedException;
use Symfony\Contracts\Translation\TranslatorInterface;

final class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly TranslatorInterface $translator,
        #[Autowire('%kernel.debug%')]
        private readonly bool $debug = false,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            ExceptionEvent::class => 'onKernelException',
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $throwable = $event->getThrowable();

        if ($throwable instanceof ApiException) {
            $event->setResponse(ApiResponse::error(
                $throwable->getErrorCode(),
                $throwable->getMessage(),
                $throwable->getStatusCode(),
                $throwable->getData(),
            ));

            return;
        }

        $locale = $request->getLocale();

        if ($throwable instanceof AccessDeniedHttpException) {
            $event->setResponse(ApiResponse::error(
                'ACCESS_DENIED',
                $throwable->getMessage() !== '' ? $throwable->getMessage() : $this->translator->trans('api_error.access_denied', [], 'messages', $locale),
                Response::HTTP_FORBIDDEN,
            ));

            return;
        }

        if ($throwable instanceof AuthenticationException) {
            $event->setResponse(ApiResponse::error(
                'UNAUTHORIZED',
                $this->translator->trans('api_error.unauthorized', [], 'messages', $locale),
                Response::HTTP_UNAUTHORIZED,
            ));

            return;
        }

        if ($throwable instanceof ValidationFailedException) {
            $violations = [];
            foreach ($throwable->getViolations() as $violation) {
                $violations[$violation->getPropertyPath()] = $violation->getMessage();
            }

            $event->setResponse(ApiResponse::error(
                'VALIDATION_FAILED',
                $this->translator->trans('api_error.validation_failed', [], 'messages', $locale),
                Response::HTTP_BAD_REQUEST,
                $violations
            ));

            return;
        }

        if ($throwable instanceof NotFoundHttpException) {
            $event->setResponse(ApiResponse::error(
                'NOT_FOUND',
                $this->translator->trans('api_error.not_found', [], 'messages', $locale),
                Response::HTTP_NOT_FOUND,
            ));

            return;
        }

        if ($throwable instanceof HttpExceptionInterface) {
            $event->setResponse(ApiResponse::error(
                'HTTP_ERROR',
                $throwable->getMessage() !== '' ? $throwable->getMessage() : ($this->translator->trans('api_error.http_error', [], 'messages', $locale) ?: (Response::$statusTexts[$throwable->getStatusCode()] ?? 'HTTP error.')),
                $throwable->getStatusCode(),
            ));

            return;
        }

        $this->logger->error('Unhandled API exception.', [
            'path' => $request->getPathInfo(),
            'exception' => $throwable,
        ]);

        $message = $this->debug && $throwable->getMessage() !== ''
            ? $throwable->getMessage()
            : $this->translator->trans('api_error.internal_server_error', [], 'messages', $locale);

        $event->setResponse(ApiResponse::error(
            'INTERNAL_SERVER_ERROR',
            $message,
            Response::HTTP_INTERNAL_SERVER_ERROR,
        ));
    }
}
