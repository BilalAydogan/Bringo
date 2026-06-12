<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class EventControllerTest extends WebTestCase
{
    public function testListEventsRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->jsonRequest('GET', '/api/events');

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateEventEndpointExists(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/events');

        // 401 dönerse endpoint var demektir
        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }
}