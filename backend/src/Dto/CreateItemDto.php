<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class CreateItemDto
{
    #[Assert\NotBlank(message: 'Malzeme adı boş olamaz.')]
    #[Assert\Length(max: 255, maxMessage: 'Malzeme adı en fazla {{ limit }} karakter olabilir.')]
    public ?string $name = null;

    #[Assert\NotNull(message: 'Toplam adet boş olamaz.')]
    #[Assert\Positive(message: 'Toplam adet en az 1 olmalıdır.')]
    public ?int $target_quantity = null;
}
