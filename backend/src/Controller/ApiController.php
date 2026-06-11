<?php

namespace App\Controller;

use App\Entity\User;
use App\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\Exception\ExceptionInterface as SerializerExceptionInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

abstract class ApiController extends AbstractController
{
    protected function deserializeJson(
        Request $request,
        string $type,
        SerializerInterface $serializer,
        string $message = 'Geçersiz JSON verisi.',
    ): mixed {
        try {
            return $serializer->deserialize($request->getContent(), $type, 'json');
        } catch (SerializerExceptionInterface|\TypeError|\JsonException $exception) {
            throw new ApiException('INVALID_JSON', $message, Response::HTTP_BAD_REQUEST, previous: $exception);
        }
    }

    protected function decodeJsonObject(
        Request $request,
        string $message = 'Geçersiz JSON verisi.',
    ): array {
        try {
            $data = json_decode($request->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new ApiException('INVALID_JSON', $message, Response::HTTP_BAD_REQUEST, previous: $exception);
        }

        if (!is_array($data)) {
            throw new ApiException('INVALID_JSON', $message, Response::HTTP_BAD_REQUEST);
        }

        return $data;
    }

    protected function validateDto(
        mixed $dto,
        ValidatorInterface $validator,
        string $messageCode = 'VALIDATION_FAILED',
    ): void {
        $errors = $validator->validate($dto);
        if (count($errors) === 0) {
            return;
        }

        $messages = array_map(
            static fn ($error) => $error->getMessage(),
            iterator_to_array($errors),
        );

        throw new ApiException($messageCode, implode(', ', $messages), Response::HTTP_BAD_REQUEST);
    }

    protected function requireUserEntity(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw new ApiException('UNAUTHORIZED', 'Oturum bulunamadı.', Response::HTTP_UNAUTHORIZED);
        }

        return $user;
    }
}
