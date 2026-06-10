<?php

namespace App\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class ApiResponse
{
    public static function success(mixed $data = null, string $message = '', int $status = Response::HTTP_OK): JsonResponse
    {
        $payload = ['success' => true];

        if ($message !== '') {
            $payload['message'] = $message;
        }

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return new JsonResponse($payload, $status);
    }

    public static function error(string $code, string $message, int $status = Response::HTTP_BAD_REQUEST, mixed $data = null): JsonResponse
    {
        $error = [
            'code' => $code,
            'message' => $message,
        ];

        if ($data !== null) {
            $error['data'] = $data;
        }

        return new JsonResponse([
            'success' => false,
            'error' => $error,
        ], $status);
    }
}
