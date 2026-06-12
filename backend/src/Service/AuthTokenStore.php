<?php

namespace App\Service;

use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class AuthTokenStore
{
    private ?\Redis $redis = null;
    private string $host;
    private int $port;
    private ?string $password;
    private int $database;

    public function __construct(
        #[Autowire('%env(REDIS_URL)%')]
        string $redisUrl,
    ) {
        $parts = parse_url($redisUrl);
        $this->host = $parts['host'] ?? '127.0.0.1';
        $this->port = (int) ($parts['port'] ?? 6379);
        $this->password = isset($parts['pass']) ? (string) $parts['pass'] : null;
        $path = trim((string) ($parts['path'] ?? ''), '/');
        $this->database = $path !== '' ? (int) $path : 0;
    }

    public function issueLoginCode(User $user): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $this->redis()->setex($this->loginCodeKey($user), 600, $code);

        return $code;
    }

    public function verifyLoginCode(User $user, string $code): bool
    {
        $stored = $this->redis()->get($this->loginCodeKey($user));

        if ($stored === false || (string) $stored !== (string) $code) {
            return false;
        }

        $this->redis()->del($this->loginCodeKey($user));

        return true;
    }

    public function issuePasswordReset(User $user): string
    {
        $redis = $this->redis();
        $userId = $this->userId($user);
        $reverseKey = $this->passwordResetUserKey($userId);
        $existingToken = $redis->get($reverseKey);

        if (is_string($existingToken) && $existingToken !== '') {
            $redis->del($this->passwordResetTokenKey($existingToken));
        }

        $token = \Symfony\Component\Uid\Uuid::v4()->toRfc4122();
        $ttl = 1800;

        $redis->setex($this->passwordResetTokenKey($token), $ttl, $userId);
        $redis->setex($reverseKey, $ttl, $token);

        return $token;
    }

    public function issueEmailVerification(User $user): string
    {
        $redis = $this->redis();
        $userId = $this->userId($user);
        $reverseKey = $this->emailVerificationUserKey($userId);
        $existingToken = $redis->get($reverseKey);

        if (is_string($existingToken) && $existingToken !== '') {
            $redis->del($this->emailVerificationTokenKey($existingToken));
        }

        $token = \Symfony\Component\Uid\Uuid::v4()->toRfc4122();
        $ttl = 86400;

        $redis->setex($this->emailVerificationTokenKey($token), $ttl, $userId);
        $redis->setex($reverseKey, $ttl, $token);

        return $token;
    }

    public function resolveEmailVerificationUserId(string $token): ?string
    {
        $stored = $this->redis()->get($this->emailVerificationTokenKey($token));

        return is_string($stored) && $stored !== '' ? $stored : null;
    }

    public function clearEmailVerificationToken(string $token, string $userId): void
    {
        $this->redis()->del(
            $this->emailVerificationTokenKey($token),
            $this->emailVerificationUserKey($userId),
        );
    }

    public function resolvePasswordResetUserId(string $token): ?string
    {
        $stored = $this->redis()->get($this->passwordResetTokenKey($token));

        return is_string($stored) && $stored !== '' ? $stored : null;
    }

    public function clearPasswordResetToken(string $token, string $userId): void
    {
        $this->redis()->del(
            $this->passwordResetTokenKey($token),
            $this->passwordResetUserKey($userId),
        );
    }

    private function redis(): \Redis
    {
        if ($this->redis instanceof \Redis) {
            return $this->redis;
        }

        $redis = new \Redis();
        $redis->connect($this->host, $this->port);

        if ($this->password !== null && $this->password !== '') {
            $redis->auth($this->password);
        }

        if ($this->database > 0) {
            $redis->select($this->database);
        }

        return $this->redis = $redis;
    }

    private function loginCodeKey(User $user): string
    {
        return sprintf('auth:2fa:%s', $this->userId($user));
    }

    private function emailVerificationTokenKey(string $token): string
    {
        return sprintf('auth:email_verification:%s', $token);
    }

    private function emailVerificationUserKey(string $userId): string
    {
        return sprintf('auth:email_verification_user:%s', $userId);
    }

    private function passwordResetTokenKey(string $token): string
    {
        return sprintf('auth:password_reset:%s', $token);
    }

    private function passwordResetUserKey(string $userId): string
    {
        return sprintf('auth:password_reset_user:%s', $userId);
    }

    private function userId(User $user): string
    {
        return (string) $user->getId()?->toRfc4122();
    }
}
