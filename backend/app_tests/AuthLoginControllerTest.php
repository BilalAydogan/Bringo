<?php

namespace App\Tests;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class AuthLoginControllerTest extends WebTestCase
{
    public function testLoginReturnsBadRequestWhenCredentialsAreMissing(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/auth/login', server: ['CONTENT_TYPE' => 'application/json'], content: '{}');

        self::assertResponseStatusCodeSame(400);
        self::assertResponseFormatSame('json');
        self::assertSame([
            'message' => 'Missing credentials',
        ], json_decode($client->getResponse()->getContent() ?: '{}', true));
    }
}
