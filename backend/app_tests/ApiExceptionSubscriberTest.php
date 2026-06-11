<?php

namespace App\Tests;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ApiExceptionSubscriberTest extends WebTestCase
{
    public function testRegisterReturnsStandardizedInvalidJsonError(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/auth/register',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: '{"email":',
        );

        self::assertResponseStatusCodeSame(400);
        self::assertResponseFormatSame('json');
        self::assertSame([
            'success' => false,
            'error' => [
                'code' => 'INVALID_JSON',
                'message' => 'Invalid JSON payload',
            ],
        ], json_decode($client->getResponse()->getContent() ?: '{}', true));
    }
}
