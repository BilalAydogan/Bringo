<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class CreateContractDto
{
    #[Assert\NotBlank(message: 'Sözleşme başlığı boş olamaz.')]
    #[Assert\Length(max: 255, maxMessage: 'Başlık en fazla {{ limit }} karakter olabilir.')]
    public ?string $title = null;

    #[Assert\NotBlank(message: 'Sözleşme içeriği boş olamaz.')]
    public ?string $content = null;

    #[Assert\NotNull(message: 'Sürüm boş olamaz.')]
    #[Assert\Positive(message: 'Sürüm pozitif bir sayı olmalıdır.')]
    public ?float $version = null;

    #[Assert\NotNull(message: 'Zorunluluk durumu belirtilmelidir.')]
    public ?bool $is_required = null;

    /**
     * @var array<int, array{locale?: string, title?: string, content?: string}>|null
     */
    public ?array $translations = null;
}
