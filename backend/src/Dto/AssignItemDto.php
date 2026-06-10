<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class AssignItemDto
{
    #[Assert\NotBlank(message: 'Kullanıcı ID boş olamaz.')]
    public ?string $user_id = null;
}
