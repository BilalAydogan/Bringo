<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class UpdateContractDto
{
    #[Assert\Length(max: 255, maxMessage: 'Başlık en fazla {{ limit }} karakter olabilir.')]
    public ?string $title = null;

    public ?string $content = null;

    #[Assert\Positive(message: 'Sürüm pozitif bir sayı olmalıdır.')]
    public ?float $version = null;

    public ?bool $is_required = null;

    /**
     * @var array<int, array{locale?: string, title?: string, content?: string}>|null
     */
    public ?array $translations = null;
}
