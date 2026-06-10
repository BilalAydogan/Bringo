<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class UpdateItemDto
{
    #[Assert\Length(max: 255, maxMessage: 'Malzeme adı en fazla {{ limit }} karakter olabilir.')]
    public ?string $name = null;

    #[Assert\Positive(message: 'Toplam adet en az 1 olmalıdır.')]
    public ?int $target_quantity = null;

    #[Assert\Length(max: 50, maxMessage: 'Durum en fazla {{ limit }} karakter olabilir.')]
    #[Assert\Choice(choices: ['pending', 'assigned', 'completed'], message: 'Geçersiz durum.')]
    public ?string $status = null;
}
