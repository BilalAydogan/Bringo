<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/locale')]
class LocaleController extends AbstractController
{
    #[Route('', name: 'api_locale', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        return $this->json([
            'data' => [
                'locale' => $request->getLocale(),
                'available_locales' => ['tr', 'en'],
            ],
        ]);
    }
}
