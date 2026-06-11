<?php

namespace App\Service;

use App\Entity\Contract;
use App\Entity\User;
use App\Entity\UserContract;
use App\Message\SendContractOtpMessage;
use App\Repository\ContractRepository;
use App\Repository\UserContractRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Messenger\MessageBusInterface;

class ContractService
{
    public function __construct(
        private ContractRepository $contractRepository,
        private UserContractRepository $userContractRepository,
        private ContractOtpService $contractOtpService,
        private ContractDiffService $contractDiffService,
        private EntityManagerInterface $em,
        private MessageBusInterface $messageBus,
        private RequestStack $requestStack,
    ) {
    }

    public function getActiveContract(): ?Contract
    {
        return $this->contractRepository->findActiveContract();
    }

    public function getPendingContract(User $user): ?Contract
    {
        return $this->contractRepository->findPendingForUser($user);
    }

    public function hasPendingContract(User $user): bool
    {
        return $this->getPendingContract($user) !== null;
    }

    /**
     * @return array<string, mixed>|null
     */
    /**
     * @return array<string, mixed>|null
     */
    /**
     * @return array<string, mixed>|null
     */
    /**
     * @return array<string, mixed>|null
     */
    public function buildApprovalPayload(?Contract $contract, ?string $locale = null): ?array
    {
        if ($contract === null) {
            return null;
        }

        $locale = $locale ?? $this->resolveLocale();
        $previous = $this->contractRepository->findPreviousContract($contract);
        $payload = [
            'contract' => $this->serializeContract($contract, $locale),
            'previous_contract' => $previous ? $this->serializeContract($previous, $locale) : null,
            'diff' => null,
        ];

        if ($previous !== null) {
            $payload['diff'] = $this->contractDiffService->diffLines(
                $this->safeLocalizedContent($previous, $locale),
                $this->safeLocalizedContent($contract, $locale),
            );
        }

        return $payload;
    }

    public function requestOtp(User $user, Contract $contract, ?string $locale = null): void
    {
        if (!$this->isContractPendingForUser($user, $contract)) {
            throw new \InvalidArgumentException('Bu sözleşme onay beklemiyor.');
        }

        if (!$this->contractOtpService->canResend($user, $contract)) {
            throw new \RuntimeException('Yeni kod göndermek için lütfen 60 saniye bekleyin.');
        }

        $code = $this->contractOtpService->generateAndStore($user, $contract);
        $this->contractOtpService->markResent($user, $contract);
        $locale = $locale ?? $this->resolveLocale();

        $this->messageBus->dispatch(new SendContractOtpMessage(
            (string) $user->getEmail(),
            $this->safeLocalizedTitle($contract, $locale),
            $code,
            $locale,
        ));
    }

    public function acceptWithOtp(User $user, Contract $contract, string $code, ?string $ipAddress): void
    {
        if ($this->contractRepository->hasUserAcceptedContract($user, $contract)) {
            return;
        }

        if (!$this->isContractPendingForUser($user, $contract)) {
            throw new \InvalidArgumentException('Bu sözleşme onay beklemiyor.');
        }

        if (!$this->contractOtpService->verify($user, $contract, $code)) {
            throw new \InvalidArgumentException('Geçersiz veya süresi dolmuş doğrulama kodu.');
        }

        $userContract = new UserContract();
        $userContract->setUser($user);
        $userContract->setContract($contract);
        $userContract->setIpAddress($ipAddress);

        $this->em->persist($userContract);
        $this->em->flush();
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    public function serializeContract(Contract $contract, ?string $locale = null): array
    {
        $locale = $locale ?? $this->resolveLocale();
        $translations = [];

        try {
            foreach ($contract->getTranslations() as $translation) {
                $translations[] = [
                    'locale' => $translation->getLocale(),
                    'title' => $translation->getTitle(),
                    'content' => $translation->getContent(),
                ];
            }
        } catch (\Throwable) {
            $translations = [];
        }

        return [
            'id' => $contract->getId()->toRfc4122(),
            'title' => $this->safeLocalizedTitle($contract, $locale),
            'content' => $this->safeLocalizedContent($contract, $locale),
            'version' => $contract->getVersion(),
            'is_active' => $contract->isActive(),
            'created_at' => $this->formatUtc($contract->getCreatedAt()),
            'accepted_count' => $this->userContractRepository->countByContract($contract),
            'translations' => $translations,
        ];
    }

    public function findActiveContractOrFail(string $contractId): Contract
    {
        $contract = $this->contractRepository->find($contractId);

        if (!$contract || !$contract->isActive()) {
            throw new \InvalidArgumentException('Geçersiz veya aktif olmayan sözleşme.');
        }

        return $contract;
    }

    private function isContractPendingForUser(User $user, Contract $contract): bool
    {
        $pending = $this->getPendingContract($user);

        return $pending !== null && $pending->getId()->equals($contract->getId());
    }

    private function resolveLocale(): string
    {
        $locale = $this->requestStack->getCurrentRequest()?->getLocale() ?? 'tr';

        return str_starts_with(strtolower($locale), 'en') ? 'en' : 'tr';
    }

    private function safeLocalizedTitle(Contract $contract, ?string $locale = null): string
    {
        try {
            return $contract->getLocalizedTitle($locale);
        } catch (\Throwable) {
            return (string) $contract->getTitle();
        }
    }

    private function safeLocalizedContent(Contract $contract, ?string $locale = null): string
    {
        try {
            return $contract->getLocalizedContent($locale);
        } catch (\Throwable) {
            return (string) $contract->getContent();
        }
    }

    private function formatUtc(?\DateTimeInterface $date): ?string
    {
        if ($date === null) {
            return null;
        }

        return \DateTimeImmutable::createFromInterface($date)
            ->setTimezone(new \DateTimeZone('UTC'))
            ->format(\DateTimeInterface::ATOM);
    }
}
