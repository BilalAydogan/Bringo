<?php

namespace App\Controller;

use App\Entity\UserNotification;
use App\Http\ApiResponse;
use App\Repository\UserNotificationRepository;
use App\Service\NotificationService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/notifications')]
class NotificationController extends ApiController
{
    #[Route('', name: 'api_notifications_list', methods: ['GET'])]
    public function list(Request $request, UserNotificationRepository $notificationRepository, NotificationService $notificationService): JsonResponse
    {
        $user = $this->requireUserEntity();
        $limit = max(1, min(20, $request->query->getInt('limit', 10)));

        $items = array_map(
            static fn (UserNotification $notification) => $notificationService->serialize($notification),
            $notificationRepository->findLatestByUser($user, $limit),
        );

        return ApiResponse::success([
            'items' => $items,
            'unread_count' => $notificationRepository->countUnreadForUser($user),
        ]);
    }

    #[Route('/read-all', name: 'api_notifications_read_all', methods: ['POST'])]
    public function markAllRead(NotificationService $notificationService): JsonResponse
    {
        $user = $this->requireUserEntity();
        $updated = $notificationService->markAllAsRead($user);

        return ApiResponse::success([
            'updated' => $updated,
        ]);
    }

    #[Route('/{id}/read', name: 'api_notifications_read', methods: ['POST'])]
    public function markRead(string $id, UserNotificationRepository $notificationRepository, NotificationService $notificationService): JsonResponse
    {
        $user = $this->requireUserEntity();

        if (!Uuid::isValid($id)) {
            return ApiResponse::error('INVALID_ID', 'Invalid notification id.', Response::HTTP_BAD_REQUEST);
        }

        $notification = $notificationRepository->find($id);
        if (!$notification instanceof UserNotification || !$notification->getUser()?->getId()?->equals($user->getId())) {
            return ApiResponse::error('NOTIFICATION_NOT_FOUND', 'Notification not found.', Response::HTTP_NOT_FOUND);
        }

        $notificationService->markAsRead($notification);

        return ApiResponse::success($notificationService->serialize($notification));
    }

    #[Route('/stream', name: 'api_notifications_stream', methods: ['GET'])]
    public function streamNotifications(
        Request $request,
        UserNotificationRepository $notificationRepository,
        NotificationService $notificationService,
    ): Response {
        $user = $this->requireUserEntity();

        $response = new StreamedResponse(function () use ($user, $notificationRepository, $notificationService): void {
            @set_time_limit(0);
            @ini_set('output_buffering', 'off');
            @ini_set('zlib.output_compression', '0');

            $lastHash = null;
            $startedAt = time();

            while (!connection_aborted() && (time() - $startedAt) < 25) {
                $payload = [
                    'items' => array_map(
                        static fn (UserNotification $notification) => $notificationService->serialize($notification),
                        $notificationRepository->findLatestByUser($user, 8),
                    ),
                    'unread_count' => $notificationRepository->countUnreadForUser($user),
                ];

                $hash = md5(json_encode($payload));

                if ($hash !== $lastHash) {
                    echo "event: notifications\n";
                    echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
                    $lastHash = $hash;
                } else {
                    echo ": keepalive\n\n";
                }

                @ob_flush();
                flush();
                sleep(2);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache, no-transform');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no');

        return $response;
    }
}
