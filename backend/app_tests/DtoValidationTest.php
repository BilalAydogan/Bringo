<?php

namespace App\Tests;

use App\Dto\CreateEventDto;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class DtoValidationTest extends KernelTestCase
{
    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->validator = self::getContainer()->get('validator');
    }

    public function testCreateEventDtoRequiresTitleAndDate(): void
    {
        $dto = new CreateEventDto();
        $errors = $this->validator->validate($dto);
        
        self::assertGreaterThanOrEqual(2, count($errors), 'Title ve date zorunlu');
    }

    public function testCreateEventDtoAcceptsValidData(): void
    {
        $dto = new CreateEventDto();
        $dto->title = 'Test Event';
        $dto->date = '2025-12-25 10:00:00';
        $dto->location = 'Test Location';

        $errors = $this->validator->validate($dto);
        
        self::assertCount(0, $errors, 'Geçerli veri için hata olmaz');
    }
}