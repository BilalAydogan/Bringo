<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
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
        $user = $this->getUser();
        $locale = $user instanceof User ? $user->getPreferredLocale() : $request->getLocale();

        return $this->json([
            'data' => [
                'locale' => $locale,
                'available_locales' => ['tr', 'en'],
            ],
        ]);
    }

    #[Route('', name: 'api_locale_update', methods: ['POST'])]
    public function update(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Unauthorized',
                ],
            ], 401);
        }

        $data = json_decode($request->getContent(), true);
        $locale = is_array($data) ? (string) ($data['locale'] ?? '') : '';
        $normalized = strtolower(str_replace('_', '-', trim($locale)));

        if (!in_array($normalized, ['tr', 'en'], true)) {
            return $this->json([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_LOCALE',
                    'message' => 'Unsupported locale.',
                ],
            ], 400);
        }

        $user->setPreferredLocale($normalized);
        $em->flush();

        return $this->json([
            'success' => true,
            'data' => [
                'locale' => $user->getPreferredLocale(),
            ],
        ]);
    }
}
