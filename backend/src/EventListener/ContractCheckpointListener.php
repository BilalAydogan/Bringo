<?php

namespace App\EventListener;

use App\Entity\User;
use App\Http\ApiResponse;
use App\Service\ContractService;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

#[AsEventListener(event: KernelEvents::REQUEST, priority: 8)]
final class ContractCheckpointListener
{
    private const WHITELISTED_PATHS = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/verify-2fa',
        '/api/auth/verify-email',
        '/api/auth/refresh',
        '/api/auth/logout',
        '/api/contracts/active',
        '/api/contracts/status',
        '/api/contracts/request-otp',
        '/api/contracts/verify-otp',
    ];

    public function __construct(
        private TokenStorageInterface $tokenStorage,
        private ContractService $contractService,
    ) {
    }

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $path = $event->getRequest()->getPathInfo();

        if (!str_starts_with($path, '/api') || in_array($path, self::WHITELISTED_PATHS, true)) {
            return;
        }

        $user = $this->tokenStorage->getToken()?->getUser();
        if (!$user instanceof User) {
            return;
        }

        $pending = $this->contractService->getPendingContract($user);
        if ($pending === null) {
            return;
        }

        $event->setResponse(ApiResponse::error(
            'CONTRACT_APPROVAL_REQUIRED',
            'Devam etmek için güncel sözleşmeyi onaylamanız gerekiyor.',
            403,
            [
                'approval' => $this->contractService->buildApprovalPayload($pending),
            ],
        ));
    }
}
