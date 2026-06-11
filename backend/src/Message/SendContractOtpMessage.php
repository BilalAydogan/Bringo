<?php

namespace App\Message;

final class SendContractOtpMessage
{
    public function __construct(
        public readonly string $email,
        public readonly string $contractTitle,
        public readonly string $code,
        public readonly string $locale = 'tr',
    ) {
    }
}
