<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class VerifyContractOtpDto
{
    #[Assert\NotBlank(message: 'Sözleşme kimliği gereklidir.')]
    #[Assert\Uuid(message: 'Geçersiz sözleşme kimliği.')]
    public string $contractId;

    #[Assert\NotBlank(message: 'Doğrulama kodu gereklidir.')]
    #[Assert\Length(exactly: 6, exactMessage: 'Doğrulama kodu 6 haneli olmalıdır.')]
    #[Assert\Regex(pattern: '/^\d{6}$/', message: 'Doğrulama kodu yalnızca rakamlardan oluşmalıdır.')]
    public string $code;
}
