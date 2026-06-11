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

final class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly LoggerInterface $logger,
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

        if ($throwable instanceof AccessDeniedHttpException) {
            $event->setResponse(ApiResponse::error(
                'ACCESS_DENIED',
                $throwable->getMessage() !== '' ? $throwable->getMessage() : 'Bu işlem için yetkiniz yok.',
                Response::HTTP_FORBIDDEN,
            ));

            return;
        }

        if ($throwable instanceof NotFoundHttpException) {
            $event->setResponse(ApiResponse::error(
                'NOT_FOUND',
                'İstenen kaynak bulunamadı.',
                Response::HTTP_NOT_FOUND,
            ));

            return;
        }

        if ($throwable instanceof HttpExceptionInterface) {
            $event->setResponse(ApiResponse::error(
                'HTTP_ERROR',
                $throwable->getMessage() !== '' ? $throwable->getMessage() : Response::$statusTexts[$throwable->getStatusCode()] ?? 'HTTP hatası.',
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
            : 'Beklenmeyen bir sunucu hatası oluştu.';

        $event->setResponse(ApiResponse::error(
            'INTERNAL_SERVER_ERROR',
            $message,
            Response::HTTP_INTERNAL_SERVER_ERROR,
        ));
    }
}
