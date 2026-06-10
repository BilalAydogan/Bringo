<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class RegisterDto
{
    #[Assert\NotBlank(message: 'Ad alanı boş bırakılamaz.')]
    #[Assert\Length(
        min: 2,
        max: 100,
        minMessage: 'Ad en az {{ limit }} karakter olmalıdır.',
        maxMessage: 'Ad en fazla {{ limit }} karakter olabilir.'
    )]
    public string $firstName;

    #[Assert\NotBlank(message: 'Soyad alanı boş bırakılamaz.')]
    #[Assert\Length(
        min: 2,
        max: 100,
        minMessage: 'Soyad en az {{ limit }} karakter olmalıdır.',
        maxMessage: 'Soyad en fazla {{ limit }} karakter olabilir.'
    )]
    public string $lastName;

    #[Assert\NotBlank(message: 'E-posta alanı boş bırakılamaz.')]
    #[Assert\Email(message: 'Geçersiz e-posta adresi.')]
    public string $email;

    #[Assert\NotBlank(message: 'Parola alanı boş bırakılamaz.')]
    #[Assert\Length(
        min: 6,
        minMessage: 'Parolanız en az {{ limit }} karakter olmalıdır.',
        max: 4096
    )]
    public string $password;

    #[Assert\IsTrue(message: 'Kullanıcı sözleşmesini kabul etmelisiniz.')]
    public bool $acceptTerms = false;
}
