<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class CreateEventDto
{
    #[Assert\NotBlank(message: 'Etkinlik başlığı boş bırakılamaz.')]
    #[Assert\Length(max: 255, maxMessage: 'Başlık en fazla {{ limit }} karakter olabilir.')]
    public string $title;

    #[Assert\Length(max: 5000, maxMessage: 'Açıklama en fazla {{ limit }} karakter olabilir.')]
    public ?string $description = null;

    #[Assert\NotBlank(message: 'Etkinlik tarihi gereklidir.')]
    public string $date;

    #[Assert\Length(max: 255, maxMessage: 'Konum en fazla {{ limit }} karakter olabilir.')]
    public ?string $location = null;

    #[Assert\NotBlank(message: 'Etkinlik zaman dilimi gereklidir.')]
    #[Assert\Length(max: 64, maxMessage: 'Zaman dilimi geçersiz.')]
    public string $timezone = 'UTC';
}
