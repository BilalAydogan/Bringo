<?php

namespace App\Service;

final class EmailTemplateRenderer
{
    /**
     * @param list<string> $paragraphs
     * @param array<string, string> $details
     */
    public function render(
        string $title,
        string $intro,
        array $paragraphs = [],
        ?string $preheader = null,
        ?string $greeting = null,
        ?string $ctaLabel = null,
        ?string $ctaUrl = null,
        ?string $code = null,
        ?string $codeLabel = null,
        array $details = [],
        ?string $footerNote = null,
        string $documentLocale = 'tr',
        string $brandTagline = 'Etkinlik planlama bildirimleri',
        string $securityBanner = 'Bringo Güvenlik',
        string $footerDisclaimer = 'Bu e-posta Bringo hesabınızla ilgili otomatik bir bildirimdir.',
    ): string {
        $preheaderHtml = $this->escape($preheader ?? $intro);
        $greetingHtml = $greeting !== null
            ? sprintf('<p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#d4d4d4;">%s</p>', $this->escape($greeting))
            : '';

        $paragraphHtml = '';
        foreach ($paragraphs as $paragraph) {
            $paragraphHtml .= sprintf(
                '<p style="margin:0 0 14px;font-size:15px;line-height:24px;color:#a3a3a3;">%s</p>',
                $this->escape($paragraph),
            );
        }

        $codeHtml = '';
        if ($code !== null) {
            $codeHtml = sprintf(
                '<div style="margin:28px 0;padding:20px 24px;border-radius:16px;background:#111827;border:1px solid #374151;text-align:center;">
                    <div style="margin-bottom:8px;font-size:12px;line-height:18px;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;font-weight:700;">%s</div>
                    <div style="font-size:34px;line-height:40px;color:#ffffff;font-weight:800;letter-spacing:8px;font-family:Menlo,Consolas,monospace;">%s</div>
                </div>',
                $this->escape($codeLabel ?? 'Doğrulama kodu'),
                $this->escape($code),
            );
        }

        $ctaHtml = '';
        if ($ctaLabel !== null && $ctaUrl !== null) {
            $ctaHtml = sprintf(
                '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 6px;">
                    <tr>
                        <td style="border-radius:12px;background:#2563eb;">
                            <a href="%s" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">%s</a>
                        </td>
                    </tr>
                </table>',
                $this->escapeAttribute($ctaUrl),
                $this->escape($ctaLabel),
            );
        }

        $detailsHtml = '';
        if ($details !== []) {
            $rows = '';
            foreach ($details as $label => $value) {
                $rows .= sprintf(
                    '<tr>
                        <td style="padding:10px 0;border-bottom:1px solid #262626;color:#737373;font-size:13px;">%s</td>
                        <td style="padding:10px 0;border-bottom:1px solid #262626;color:#e5e5e5;font-size:13px;text-align:right;font-weight:600;">%s</td>
                    </tr>',
                    $this->escape($label),
                    $this->escape($value),
                );
            }

            $detailsHtml = sprintf(
                '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin-top:24px;border-collapse:collapse;">%s</table>',
                $rows,
            );
        }

        $footerNoteHtml = $footerNote !== null
            ? sprintf('<p style="margin:20px 0 0;font-size:13px;line-height:20px;color:#737373;">%s</p>', $this->escape($footerNote))
            : '';

        return sprintf(
            '<!doctype html>
            <html lang="%s">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>%s</title>
            </head>
            <body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#f5f5f5;">
                <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">%s</div>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="background:#0a0a0a;padding:32px 16px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="max-width:600px;border-collapse:collapse;">
                                <tr>
                                    <td style="padding:0 0 18px;">
                                        <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0;">Bringo</div>
                                        <div style="margin-top:4px;font-size:13px;color:#737373;">%s</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="border:1px solid #262626;background:#171717;border-radius:20px;padding:34px 32px;box-shadow:0 18px 50px rgba(0,0,0,.28);">
                                        <div style="display:inline-block;margin-bottom:16px;padding:7px 10px;border-radius:999px;background:#1d4ed8;color:#dbeafe;font-size:12px;font-weight:700;">%s</div>
                                        <h1 style="margin:0 0 12px;font-size:28px;line-height:34px;color:#ffffff;font-weight:800;">%s</h1>
                                        %s
                                        <p style="margin:0 0 18px;font-size:16px;line-height:26px;color:#d4d4d4;">%s</p>
                                        %s
                                        %s
                                        %s
                                        %s
                                        %s
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:18px 4px 0;text-align:center;color:#525252;font-size:12px;line-height:18px;">
                                        %s
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>',
            $this->escapeAttribute($documentLocale),
            $this->escape($title),
            $preheaderHtml,
            $this->escape($title),
            $greetingHtml,
            $this->escape($intro),
            $paragraphHtml,
            $codeHtml,
            $ctaHtml,
            $detailsHtml,
            $footerNoteHtml,
            $this->escape($brandTagline),
            $this->escape($securityBanner),
            $this->escape($footerDisclaimer),
        );
    }

    /**
     * @param list<string> $paragraphs
     * @param array<string, string> $details
     */
    public function renderText(
        string $title,
        string $intro,
        array $paragraphs = [],
        ?string $greeting = null,
        ?string $ctaLabel = null,
        ?string $ctaUrl = null,
        ?string $code = null,
        ?string $codeLabel = null,
        array $details = [],
        ?string $footerNote = null,
        string $brandTagline = 'Etkinlik planlama bildirimleri',
        string $footerDisclaimer = 'Bu e-posta Bringo hesabınızla ilgili otomatik bir bildirimdir.',
    ): string {
        $lines = ['Bringo', $brandTagline, '', $title, ''];

        if ($greeting !== null) {
            $lines[] = $greeting;
            $lines[] = '';
        }

        $lines[] = $intro;

        foreach ($paragraphs as $paragraph) {
            $lines[] = '';
            $lines[] = $paragraph;
        }

        if ($code !== null) {
            $lines[] = '';
            $lines[] = sprintf('%s: %s', $codeLabel ?? 'Doğrulama kodu', $code);
        }

        if ($ctaLabel !== null && $ctaUrl !== null) {
            $lines[] = '';
            $lines[] = sprintf('%s: %s', $ctaLabel, $ctaUrl);
        }

        foreach ($details as $label => $value) {
            $lines[] = sprintf('%s: %s', $label, $value);
        }

        if ($footerNote !== null) {
            $lines[] = '';
            $lines[] = $footerNote;
        }

        $lines[] = '';
        $lines[] = $footerDisclaimer;

        return implode("\n", $lines);
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function escapeAttribute(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
