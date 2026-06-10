<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class RequestContractOtpDto
{
    #[Assert\NotBlank(message: 'Sözleşme kimliği gereklidir.')]
    #[Assert\Uuid(message: 'Geçersiz sözleşme kimliği.')]
    public string $contractId;
}
