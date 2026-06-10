<?php

namespace App\Service;

use App\Entity\Contract;
use App\Entity\User;
use App\Entity\UserContract;
use App\Message\SendContractOtpMessage;
use App\Repository\ContractRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Messenger\MessageBusInterface;

class ContractService
{
    public function __construct(
        private ContractRepository $contractRepository,
        private ContractOtpService $contractOtpService,
        private ContractDiffService $contractDiffService,
        private EntityManagerInterface $em,
        private MessageBusInterface $messageBus,
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

    public function buildApprovalPayload(?Contract $contract): ?array
    {
        if ($contract === null) {
            return null;
        }

        $previous = $this->contractRepository->findPreviousContract($contract);
        $payload = [
            'contract' => $this->serializeContract($contract),
            'previous_contract' => $previous ? $this->serializeContract($previous) : null,
            'diff' => null,
        ];

        if ($previous !== null) {
            $payload['diff'] = $this->contractDiffService->diffLines(
                $previous->getContent(),
                $contract->getContent(),
            );
        }

        return $payload;
    }

    public function requestOtp(User $user, Contract $contract): void
    {
        if (!$this->isContractPendingForUser($user, $contract)) {
            throw new \InvalidArgumentException('Bu sözleşme onay beklemiyor.');
        }

        if (!$this->contractOtpService->canResend($user, $contract)) {
            throw new \RuntimeException('Yeni kod göndermek için lütfen 60 saniye bekleyin.');
        }

        $code = $this->contractOtpService->generateAndStore($user, $contract);
        $this->contractOtpService->markResent($user, $contract);

        $this->messageBus->dispatch(new SendContractOtpMessage(
            (string) $user->getEmail(),
            $contract->getTitle(),
            $code,
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

    public function serializeContract(Contract $contract): array
    {
        return [
            'id' => $contract->getId()->toRfc4122(),
            'title' => $contract->getTitle(),
            'content' => $contract->getContent(),
            'version' => $contract->getVersion(),
            'is_active' => $contract->isActive(),
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
}
