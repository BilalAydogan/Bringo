<?php

namespace App\Service;

use App\Entity\User;
use App\Entity\UserNotification;
use App\Repository\UserNotificationRepository;
use Doctrine\ORM\EntityManagerInterface;

class NotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserNotificationRepository $notificationRepository,
    ) {
    }

    public function create(User $user, string $type, string $title, string $message, ?string $url = null): UserNotification
    {
        $notification = new UserNotification();
        $notification->setUser($user);
        $notification->setType($type);
        $notification->setTitle($title);
        $notification->setMessage($message);
        $notification->setUrl($url);

        $this->entityManager->persist($notification);
        $this->entityManager->flush();

        return $notification;
    }

    /**
     * @return array{id:string,type:?string,title:?string,message:?string,url:?string,is_read:bool,created_at:?string}
     */
    public function serialize(UserNotification $notification): array
    {
        return [
            'id' => $notification->getId()?->toRfc4122(),
            'type' => $notification->getType(),
            'title' => $notification->getTitle(),
            'message' => $notification->getMessage(),
            'url' => $notification->getUrl(),
            'is_read' => $notification->isRead(),
            'created_at' => $notification->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }

    public function markAsRead(UserNotification $notification): void
    {
        $notification->markAsRead();
        $this->entityManager->flush();
    }

    public function markAllAsRead(User $user): int
    {
        return $this->notificationRepository->markAllAsReadForUser($user);
    }
}
