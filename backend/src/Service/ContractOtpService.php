<?php

namespace App\Service;

use App\Entity\Contract;
use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class ContractOtpService
{
    private \Redis $redis;

    public function __construct(
        #[Autowire('%env(REDIS_URL)%')]
        string $redisUrl,
    ) {
        $this->redis = new \Redis();
        $parts = parse_url($redisUrl);
        $host = $parts['host'] ?? '127.0.0.1';
        $port = $parts['port'] ?? 6379;
        $this->redis->connect($host, (int) $port);
    }

    public function generateAndStore(User $user, Contract $contract): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $key = $this->otpKey($user, $contract);
        $this->redis->setex($key, 600, $code);

        return $code;
    }

    public function verify(User $user, Contract $contract, string $code): bool
    {
        $stored = $this->redis->get($this->otpKey($user, $contract));

        if ($stored === false || (string) $stored !== (string) $code) {
            return false;
        }

        $this->redis->del($this->otpKey($user, $contract));

        return true;
    }

    public function canResend(User $user, Contract $contract): bool
    {
        return !$this->redis->exists($this->resendKey($user, $contract));
    }

    public function markResent(User $user, Contract $contract): void
    {
        $this->redis->setex($this->resendKey($user, $contract), 60, '1');
    }

    private function otpKey(User $user, Contract $contract): string
    {
        return sprintf('contract_otp:%s:%s', $user->getId()->toRfc4122(), $contract->getId()->toRfc4122());
    }

    private function resendKey(User $user, Contract $contract): string
    {
        return sprintf('contract_otp_resend:%s:%s', $user->getId()->toRfc4122(), $contract->getId()->toRfc4122());
    }
}
