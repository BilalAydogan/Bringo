<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class UpdateEventDto
{
    #[Assert\Length(min: 1, max: 255, minMessage: 'Başlık boş bırakılamaz.', maxMessage: 'Başlık en fazla {{ limit }} karakter olabilir.')]
    public ?string $title = null;

    #[Assert\Length(max: 5000, maxMessage: 'Açıklama en fazla {{ limit }} karakter olabilir.')]
    public ?string $description = null;

    public ?string $date = null;

    #[Assert\Length(max: 255, maxMessage: 'Konum en fazla {{ limit }} karakter olabilir.')]
    public ?string $location = null;

    #[Assert\Length(max: 64, maxMessage: 'Zaman dilimi geçersiz.')]
    public ?string $timezone = null;
}
