<?php

namespace App\Tests;

use App\Service\EmailTemplateRenderer;
use PHPUnit\Framework\TestCase;

final class EmailTemplateRendererTest extends TestCase
{
    public function testRenderEscapesDynamicContentAndIncludesCode(): void
    {
        $renderer = new EmailTemplateRenderer();

        $html = $renderer->render(
            title: 'Verify <Account>',
            intro: 'Use this code',
            paragraphs: ['Keep it safe'],
            code: '123456',
            codeLabel: 'Verification code',
            ctaLabel: 'Open panel',
            ctaUrl: 'https://example.com?ref=mail&lang=en',
            details: ['Event' => 'Summer Meetup'],
            documentLocale: 'en',
        );

        self::assertStringContainsString('lang="en"', $html);
        self::assertStringContainsString('Verification code', $html);
        self::assertStringContainsString('123456', $html);
        self::assertStringContainsString('Verify &lt;Account&gt;', $html);
        self::assertStringContainsString('Summer Meetup', $html);
    }

    public function testRenderTextBuildsReadablePlainTextBody(): void
    {
        $renderer = new EmailTemplateRenderer();

        $text = $renderer->renderText(
            title: 'Bringo Login',
            intro: 'Your verification code is ready.',
            paragraphs: ['This code expires in 10 minutes.'],
            code: '654321',
            codeLabel: 'Verification code',
            footerNote: 'If you did not request this, ignore the email.',
            brandTagline: 'Event planning notifications',
            footerDisclaimer: 'Automated Bringo email.',
        );

        self::assertStringContainsString("Bringo\nEvent planning notifications", $text);
        self::assertStringContainsString('Verification code: 654321', $text);
        self::assertStringContainsString('If you did not request this, ignore the email.', $text);
        self::assertStringContainsString('Automated Bringo email.', $text);
    }
}
